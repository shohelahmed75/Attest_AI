def o_ragnar():
    from openai import OpenAI
    from langchain_openai import OpenAIEmbeddings
    from dotenv import load_dotenv
    from langchain_qdrant import QdrantVectorStore

    load_dotenv()
    ai = OpenAI()

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

    message_history = [
        {"role": "system", "content": system_prompt}
    ]

    embedding_model = OpenAIEmbeddings(
        model = "text-embedding-3-small"
    )

    vector_db = QdrantVectorStore.from_existing_collection(
        embedding = embedding_model,
        url = "http://localhost:6333",
        collection_name = "RAGNAR_OPENAI"
    )

    while True:
        Ask = input("\n\033[95mType Here: \033[0m")
        if Ask.strip().lower() in {"exit", "quit", "q"}:
            print("Bye!")
            break

        vector_result = vector_db.similarity_search(query = Ask)
        context = "\n\n\n".join([f"Page Content: {res.page_content}\n Page Number: {res.metadata['page_label']}"
        for res in vector_result])

        message_history.append(
            {"role": "user",
            "content": f" Context: {context} \n User Question: {Ask} "
            }
        )

        while True:
            response = ai.chat.completions.create(
                model = "gpt-5.2",
                messages = message_history
            )

            result = response.choices[0].message.content
            message_history.append(
                {"role": "assistant", "content": result}
            )

            print(f"\n\033[98mRAGNAR: {result}\033[0m")
            break

def o_ragnar_chat(query: str, history: list, collection_name: str = "RAGNAR_OPENAI"):
    from openai import OpenAI
    from langchain_openai import OpenAIEmbeddings
    from dotenv import load_dotenv
    from langchain_qdrant import QdrantVectorStore

    load_dotenv()
    ai = OpenAI()

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

    embedding_model = OpenAIEmbeddings(
        model = "text-embedding-3-small"
    )

    vector_db = QdrantVectorStore.from_existing_collection(
        embedding = embedding_model,
        url = "http://localhost:6333",
        collection_name = collection_name
    )

    vector_result = vector_db.similarity_search(query = query)
    context = "\n\n\n".join([f"Page Content: {res.page_content}\n Page Number: {res.metadata['page_label']}"
    for res in vector_result])

    formatted_history = [
        {"role": "system", "content": system_prompt}
    ]
    for msg in history:
        formatted_history.append({"role": msg["role"], "content": msg["content"]})

    formatted_history.append(
        {"role": "user", "content": f" Context: {context} \n User Question: {query} "}
    )

    response = ai.chat.completions.create(
        model = "gpt-4o", # Changing gpt-5.2 to gpt-4o as gpt-5.2 doesn't exist
        messages = formatted_history
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    o_ragnar()
