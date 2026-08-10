import os
import tempfile

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
    description="PDF based RAG system"
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
# 5. VECTOR STORE
# ============================================================

vectorstore = None


# ============================================================
# 6. PDF PROCESSING
# ============================================================

def extract_pdf(file_path):

    pdf = fitz.open(file_path)

    documents = []

    for page_number, page in enumerate(pdf.pages(), start=1):

        text = page.get_text()

        if text.strip():

            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "page": page_number + 1
                    }
                )
            )

    pdf.close()

    return documents


# ============================================================
# 7. CREATE KNOWLEDGE BASE
# ============================================================

def create_knowledge_base(file_path):

    global vectorstore

    # Extract PDF
    documents = extract_pdf(file_path)

    # Split text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks = splitter.split_documents(
        documents
    )

    # Create vector database
    vectorstore = FAISS.from_documents(
        chunks,
        embedding_model
    )

    return {
        "pages": len(documents),
        "chunks": len(chunks)
    }


# ============================================================
# 8. UPLOAD ENDPOINT
# ============================================================

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    global vectorstore

    # Validate file
    if not file.filename or not file.filename.lower().endswith(".pdf"):

        return {
            "error": "Only PDF files are supported."
        }

    # Read uploaded file
    file_bytes = await file.read()

    # Temporary file
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp_file:

        temp_file.write(file_bytes)

        temp_path = temp_file.name

    try:

        result = create_knowledge_base(
            temp_path
        )

        return {
            "message": "PDF uploaded successfully.",
            "filename": file.filename,
            "pages": result["pages"],
            "chunks": result["chunks"]
        }

    finally:

        os.remove(temp_path)


# ============================================================
# 9. CHAT REQUEST
# ============================================================

class ChatRequest(BaseModel):

    question: str


# ============================================================
# 10. PROMPT
# ============================================================

prompt = ChatPromptTemplate.from_template(
    """
You are a helpful AI assistant.

There may or may not be a document uploaded by the user.

If document context is provided and the question is
related to that document, answer using the context.

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
# 11. RAG CHAIN
# ============================================================

rag_chain = (
    prompt
    | llm
    | StrOutputParser()
)


# ============================================================
# 12. CHAT ENDPOINT
# ============================================================

@app.post("/chat")
async def chat(
    request: ChatRequest
):

    global vectorstore

    question = request.question

    # --------------------------------------------------------
    # No document uploaded
    # --------------------------------------------------------

    if vectorstore is None:

        answer = rag_chain.invoke(
            {
                "context": "No document has been uploaded.",
                "question": question
            }
        )

        return {
            "answer": answer,
            "source": "general_knowledge"
        }


    # --------------------------------------------------------
    # Retrieve relevant documents
    # --------------------------------------------------------

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 4
        }
    )

    retrieved_docs = retriever.invoke(
        question
    )


    # --------------------------------------------------------
    # Create context
    # --------------------------------------------------------

    context = "\n\n".join(
        [
            f"[Page {doc.metadata.get('page')}]\n"
            f"{doc.page_content}"
            for doc in retrieved_docs
        ]
    )


    # --------------------------------------------------------
    # Generate answer
    # --------------------------------------------------------

    answer = rag_chain.invoke(
        {
            "context": context,
            "question": question
        }
    )


    # --------------------------------------------------------
    # Return answer
    # --------------------------------------------------------

    return {
        "answer": answer,
        "source": "uploaded_document",
        "retrieved_pages": [
            doc.metadata.get("page")
            for doc in retrieved_docs
        ]
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "rag:app",
        host="127.0.0.1",
        port=8001,
        reload=True
    )

