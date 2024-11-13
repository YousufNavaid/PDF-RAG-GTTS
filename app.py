import streamlit as st
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.vectorstores.faiss import FAISS
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PyPDF2 import PdfReader
import uuid
import os
from dotenv import load_dotenv
from langchain.schema import Document
from gtts import gTTS
import tempfile

# Load environment variables
load_dotenv()

# Function to retrieve session history
def get_session_history(session: str) -> BaseChatMessageHistory:
    if session not in st.session_state.store:
        st.session_state.store[session] = ChatMessageHistory()
    return st.session_state.store[session]

# Function to process uploaded PDF files
def process_uploaded_files(uploaded_files):
    documents = []
    for uploaded_file in uploaded_files:
        pdf_reader = PdfReader(uploaded_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        documents.append(Document(page_content=text))
    return documents

# Groq API Key and embeddings setup
groq_api_key = os.getenv('GROQ_KEY')
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatGroq(groq_api_key=groq_api_key, model_name="Llama3-8b-8192")

# Streamlit app configuration
st.set_page_config(page_title="PDF RAG Chatbot (TTS)", page_icon="🤖")
st.title("PDF Conversational Agent with Text-to-speech")
st.markdown("**Welcome to the app!**  \nUpload your PDF in the sidebar to get started.")
st.sidebar.title("Upload PDFs")

# Session management
if 'session_id' not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
session_id = st.session_state.session_id
if 'store' not in st.session_state:
    st.session_state.store = {}

# File uploader for PDFs
uploaded_files = st.sidebar.file_uploader("Choose PDF file(s)", type="pdf", accept_multiple_files=True)
if uploaded_files:
    documents = process_uploaded_files(uploaded_files)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=5000, chunk_overlap=500)
    splits = text_splitter.split_documents(documents)
    vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
    retriever = vectorstore.as_retriever()

    # System prompt for history-aware retriever
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question"
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    # History aware retriever
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

    # Prompt setup for Q&A chain
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
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    # Create the Q&A chain
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain, get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer"
    )

    # Initialize the chat history if it doesn't exist
    if "messages" not in st.session_state:
        st.session_state["messages"] = [{"role": "assistant", "content": "Hello! How can I assist you with your PDFs?"}]

    # Display previous chat messages
    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    # User input
    user_input = st.chat_input(placeholder="Ask me anything about the uploaded PDFs...")

    if user_input:
        st.session_state.messages.append({"role": "user", "content": user_input})
        st.chat_message("user").write(user_input)

        # Get AI's response
        response = conversational_rag_chain.invoke(
            {"input": user_input},
            config={"configurable": {"session_id": session_id}},
        )

        assistant_response = response['answer']
        st.session_state.messages.append({"role": "assistant", "content": assistant_response})
        st.chat_message("assistant").write(assistant_response)

        # Convert the AI's response to speech using gTTS
        if st.session_state.messages[-1]["role"] == "assistant":
            tts = gTTS(assistant_response, lang='en')
            # Save the speech to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmpfile:
                tts.save(tmpfile.name)
                audio_file_path = tmpfile.name

                # Play the audio automatically using Streamlit
                st.audio(audio_file_path, format="audio/mp3", autoplay=True)
