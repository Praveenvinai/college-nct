# AI Tutor

AI Tutor is a PDF-based RAG (Retrieval-Augmented Generation) API. Upload a study document, then ask questions about it — or ask general questions without a document. Answers are grounded in retrieved context when a PDF is available, and powered by Groq’s Llama model when they are not.

## Features

- Upload a PDF and build a searchable knowledge base
- Chat with answers grounded in the uploaded document
- Fall back to general knowledge when no document is uploaded
- FastAPI endpoints with interactive docs
- Local embeddings (`all-MiniLM-L6-v2`) + FAISS vector search
- Groq LLM (`llama-3.3-70b-versatile`)

## How it works

1. A PDF is uploaded via `/upload`
2. Text is extracted, split into chunks, and embedded
3. Chunks are stored in a FAISS vector index
4. A question to `/chat` retrieves the top matching chunks
5. The LLM answers using that context (or general knowledge if none exists)

## Project structure

```text
.
├── rag.py              # FastAPI app and RAG pipeline
├── requirements.txt    # Python dependencies
├── .env                # GROQ_API_KEY (not committed)
└── README.md
```

## Requirements

- Python 3.10+
- A [Groq API key](https://console.groq.com/)

## Setup

1. Create and activate a virtual environment:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## Run

```bash
python rag.py
```

The API starts at [http://127.0.0.1:8001](http://127.0.0.1:8001).

Interactive docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

## API

### `POST /upload`

Upload a PDF to build the knowledge base.

```bash
curl -X POST "http://127.0.0.1:8001/upload" ^
  -F "file=@notes.pdf"
```

Example response:

```json
{
  "message": "PDF uploaded successfully.",
  "filename": "notes.pdf",
  "pages": 12,
  "chunks": 48
}
```

### `POST /chat`

Ask a question. Uses the uploaded document when available.

```bash
curl -X POST "http://127.0.0.1:8001/chat" ^
  -H "Content-Type: application/json" ^
  -d "{\"question\": \"What are the main topics covered?\"}"
```

Example response (with document):

```json
{
  "answer": "...",
  "source": "uploaded_document",
  "retrieved_pages": [2, 5, 7, 8]
}
```

Example response (no document):

```json
{
  "answer": "...",
  "source": "general_knowledge"
}
```

## Tech stack

| Component | Library |
|-----------|---------|
| API | FastAPI, Uvicorn |
| LLM | LangChain + Groq |
| Embeddings | Hugging Face Sentence Transformers |
| Vector store | FAISS |
| PDF parsing | PyMuPDF |
| Config | python-dotenv |

## Notes

- Only PDF uploads are supported.
- The in-memory vector store resets when the server restarts.
- Keep your Groq API key in `.env` only — never commit it.
