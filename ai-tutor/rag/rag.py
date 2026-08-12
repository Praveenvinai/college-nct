import os
import tempfile
from typing import Optional

import pymupdf as fitz
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
from langchain_groq import ChatGroq


# ============================================================
# 1. CONFIGURATION
# ============================================================
load_dotenv()
GROK_API_KEY = os.getenv("GROQ_API_KEY")
if not GROK_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing. Add it to your .env file.")
os.environ["GROQ_API_KEY"] = GROK_API_KEY

# ============================================================
# 2. FASTAPI
# ============================================================

app = FastAPI(
    title="User Document RAG API",
    description="PDF based RAG system for National College AI Tutor",
)


# ============================================================
# 3. LLM
# ============================================================

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0
)


# ============================================================
# 4. EMBEDDING MODEL
# ============================================================

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# ============================================================
# 5. VECTOR STORE + DOC REGISTRY
# ============================================================

vectorstore: Optional[FAISS] = None
uploaded_docs: list[dict] = []


# ============================================================
# 6. PDF PROCESSING
# ============================================================

def extract_pdf(file_path: str, filename: str):
    pdf = fitz.open(file_path)
    documents = []

    for page_number, page in enumerate(pdf.pages(), start=1):
        text = page.get_text()
        if text.strip():
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "page": page_number,
                        "filename": filename,
                    },
                )
            )

    pdf.close()
    return documents


# ============================================================
# 7. CREATE / MERGE KNOWLEDGE BASE
# ============================================================

def add_to_knowledge_base(file_path: str, filename: str):
    global vectorstore

    documents = extract_pdf(file_path, filename)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )
    chunks = splitter.split_documents(documents)

    if vectorstore is None:
        vectorstore = FAISS.from_documents(chunks, embedding_model)
    else:
        vectorstore.add_documents(chunks)

    return {
        "pages": len(documents),
        "chunks": len(chunks),
    }


# ============================================================
# 8. HEALTH + DOCS
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "documents": len(uploaded_docs),
        "has_vectorstore": vectorstore is not None,
    }


@app.get("/documents")
async def list_docs():
    return {"documents": uploaded_docs}


@app.delete("/knowledge-base")
async def clear_docs():
    global vectorstore, uploaded_docs
    vectorstore = None
    uploaded_docs = []
    return {"message": "Knowledge base cleared.", "documents": []}


# ============================================================
# 9. UPLOAD ENDPOINT
# ============================================================

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return {"error": "Only PDF files are supported."}

    file_bytes = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name

    try:
        result = add_to_knowledge_base(temp_path, file.filename)
        entry = {
            "filename": file.filename,
            "pages": result["pages"],
            "chunks": result["chunks"],
        }
        uploaded_docs.append(entry)

        return {
            "message": "PDF uploaded successfully.",
            "filename": file.filename,
            "pages": result["pages"],
            "chunks": result["chunks"],
            "documents": uploaded_docs,
        }
    finally:
        os.remove(temp_path)


# ============================================================
# 10. CHAT REQUEST
# ============================================================

class ChatRequest(BaseModel):
    question: str
    # Optional: filter retrieval to these filenames (active docs in UI)
    filenames: Optional[list[str]] = None


# ============================================================
# 11. PROMPT
# ============================================================

prompt = ChatPromptTemplate.from_template(
    """
You are Professor Cybera, National College's AI Scholar Tutor.
Explain academic concepts clearly with structure, examples, and citations.

There may or may not be a document uploaded by the user.

If document context is provided and the question is
related to that document, answer using the context and cite
the source filename and page when possible.

If the question is a general question unrelated to the
document, answer using your general knowledge.

Never invent information and never pretend that
something came from the document when it did not.

Document Context:

{context}

User Question:

{question}

Answer:
"""
)


# ============================================================
# 12. RAG CHAIN
# ============================================================

rag_chain = (
    prompt
    | llm
    | StrOutputParser()
)


# ============================================================
# 13. CHAT ENDPOINT
# ============================================================

@app.post("/chat")
async def chat(request: ChatRequest):
    global vectorstore

    question = request.question

    if vectorstore is None:
        answer = rag_chain.invoke(
            {
                "context": "No document has been uploaded.",
                "question": question,
            }
        )
        return {
            "answer": answer,
            "source": "general_knowledge",
            "activeDocs": [],
        }

    # Over-retrieve then filter by active filenames if provided
    k = 8 if request.filenames else 4
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )
    retrieved_docs = retriever.invoke(question)

    if request.filenames:
        allowed = set(request.filenames)
        filtered = [
            doc for doc in retrieved_docs
            if doc.metadata.get("filename") in allowed
        ]
        # Fall back to unfiltered if filter emptied results
        retrieved_docs = filtered[:4] if filtered else retrieved_docs[:4]
    else:
        retrieved_docs = retrieved_docs[:4]

    context = "\n\n".join(
        [
            f"[Source: {doc.metadata.get('filename', 'document')} | Page {doc.metadata.get('page')}]\n"
            f"{doc.page_content}"
            for doc in retrieved_docs
        ]
    )

    answer = rag_chain.invoke(
        {
            "context": context,
            "question": question,
        }
    )

    cited = []
    for doc in retrieved_docs:
        name = doc.metadata.get("filename")
        if name and name not in cited:
            cited.append(name)

    return {
        "answer": answer,
        "source": "uploaded_document",
        "retrieved_pages": [
            doc.metadata.get("page") for doc in retrieved_docs
        ],
        "activeDocs": cited,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "rag:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
    )
