def g_ragnar():    
    from google import genai
    from google.genai import types
    from dotenv import load_dotenv
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from langchain_qdrant import QdrantVectorStore

    load_dotenv()
    ai = genai.Client()

    system_prompt = """
        You are RAGNAR, an advanced Retrieval-Augmented Generation (RAG) AI assistant.

        Rules:
        - Always base your answers strictly on the provided context.
        - Do not make up information or assumptions.
        - If the answer is not available in the provided context, say:
        "The requested information is not available in the provided context."
        - Then ask:
        "Would you like me to answer using general knowledge instead?" except for the information about yourself.
        - Keep responses clear, accurate, and concise.
        - Avoid repeating large sections of documents unless specifically requested.

        Your mission is to function as a trusted document intelligence engine focused on accuracy, clarity, contextual relevance, and analytical precision.

        Your name is inspired by the famous Viking Ragnar Lothbrok.
    """

    message_history = []

    embedding_model = GoogleGenerativeAIEmbeddings(
        model = "gemini-embedding-001"
    )

    vector_db = QdrantVectorStore.from_existing_collection(
        embedding = embedding_model,
        url = "http://localhost:6333",
        collection_name = "RAGNAR_GOOGLE"
    )

    while True:
        Ask = input("\n\033[96mType Here: \033[0m")
        if Ask.strip().lower() in {"exit", "quit", "q"}:
            print("Goodbye")
            break

        vector_result = vector_db.similarity_search(query = Ask)
        context = "\n\n\n".join([f"Page Content: {res.page_content}\nPage Number: {res.metadata['page_label']}"
        for res in vector_result])
        assistant = ""

        message_history.append(
            {"role": "user", "parts": [{"text": f"context: {context}\n\nuser question: {Ask}"}]}
        )

        while True:
            response = ai.models.generate_content_stream(
                model = "gemini-3-flash-preview",
                contents = message_history,
                config = types.GenerateContentConfig(
                    system_instruction = system_prompt
                )
            )


            
            print("\n\033[92mRAGNAR:\033[0m")
            for chunk in response:
                print(chunk.text, end="", flush=True)
                assistant += chunk.text
            print("\n")
            
            message_history.append(
                {"role": "model", "parts": [{"text": assistant}]}
            )
            break
g_ragnar()
