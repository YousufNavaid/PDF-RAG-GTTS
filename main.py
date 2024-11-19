import os
import uuid
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.vectorstores import FAISS
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from gtts import gTTS
import time
from PyPDF2 import PdfReader

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Store session messages and other necessary data
sessions = {}

# Define the QueryRequest schema
class QueryRequest(BaseModel):
    query: str
    session_id: str

# Load environment variables (Groq API key)
from dotenv import load_dotenv
load_dotenv()

# Groq setup
groq_api_key = os.getenv('GROQ_KEY')
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatGroq(groq_api_key=groq_api_key, model_name="Llama3-8b-8192")

# Function to process the uploaded PDF and return documents
def process_uploaded_pdf(file):
    documents = []
    pdf_reader = PdfReader(file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    documents.append(Document(page_content=text))
    return documents

# API to handle PDF upload
@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    file_location = f"temp_pdfs/{uuid.uuid4()}.pdf"
    with open(file_location, "wb") as f:
        f.write(await file.read())
    
    # Process uploaded PDF
    documents = process_uploaded_pdf(file_location)
    
    # Split documents into chunks using RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=5000, chunk_overlap=500)
    splits = text_splitter.split_documents(documents)
    
    # Create embeddings and FAISS vector store
    vectorstore = FAISS.from_documents(splits, embeddings)
    retriever = vectorstore.as_retriever()

    # Create a session and store the retriever and documents
    session_id = str(uuid.uuid4())
    sessions[session_id] = {"documents": documents, "retriever": retriever, "messages": []}
    return {"session_id": session_id, "message": "PDF uploaded successfully."}

# Function to get session history
def get_session_history(session: str) -> BaseChatMessageHistory:
    if session not in sessions:
        sessions[session] = {"history": ChatMessageHistory()}  # Initialize history if it doesn't exist
    elif "history" not in sessions[session]:
        sessions[session]["history"] = ChatMessageHistory()  # Ensure history is always present
    return sessions[session]["history"]


# API to handle user queries
# API to handle user queries
@app.post("/query/")
async def query(request: QueryRequest):
    session_data = sessions.get(request.session_id)
    if not session_data:
        return JSONResponse(status_code=400, content={"message": "Session not found"})

    retriever = session_data["retriever"]
    user_input = request.query

    # Get the session history
    chat_history = get_session_history(request.session_id)

    # Define the prompt for question answering
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question, "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )

    # Create the prompt without the 'chat_history' message type
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            ("human", "{input}"),
        ]
    )

    # Create history-aware retriever (keep 'chat_history' as part of the invocation, not the prompt template)
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

    # Define the system prompt without 'chat_history' message type
    system_prompt = (
        "You are an assistant for question-answering text from PDF. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Use three sentences maximum and keep the "
        "answer concise. Make sure your answers are to-the-point."
        "\n\n"
        "{context}"
    )

    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            ("human", "{input}"),
        ]
    )

    # Updated creation of the chain without using 'chat_history' in the message type
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

    # Combine history-aware retriever and question-answer chain
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    # Handle user input and chat history separately
    assistant_response = rag_chain.invoke(
        {
            "input": user_input,
            "chat_history": chat_history.messages  # Pass the actual chat history here as context
        }
    )["answer"]


    # Save the conversation history
    sessions[request.session_id]["messages"].append({"role": "assistant", "content": assistant_response})

    # Generate TTS audio
    tts = gTTS(assistant_response, lang="en")

    tts.save("./pdf-chatbot/src/response.mp3")

    time.sleep(1)

    return JSONResponse(content={"response": assistant_response})