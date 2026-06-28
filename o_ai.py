from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from config import SYSTEM_PROMPT

load_dotenv()
ai = OpenAI()

def get_vector_db(collection_name: str):
    embedding_model = OpenAIEmbeddings(
        model = "text-embedding-3-small"
    )
    return QdrantVectorStore.from_existing_collection(
        embedding = embedding_model,
        url = "http://localhost:6333",
        collection_name = f"{collection_name}-O"
    )

def o_attest():
    message_history = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    vector_db = None
    try:
        vector_db = get_vector_db("ATTEST_OPENAI")
    except Exception as e:
        print(f"Could not connect to Qdrant vector database: {e}. Running in General Chat Mode.")

    while True:
        Ask = input("\n\033[95mType Here: \033[0m")
        if Ask.strip().lower() in {"exit", "quit", "q"}:
            print("Bye!")
            break

        context = ""
        if vector_db:
            try:
                vector_result = vector_db.similarity_search(query = Ask, k = 5)
                context_parts = []
                for res in vector_result:
                    page_idx = res.metadata.get('page')
                    page_val = f"Page {int(page_idx) + 1}" if page_idx is not None else res.metadata.get('page_label', 'Unknown')
                    context_parts.append(f"Page Content: {res.page_content}\nPage Number: {page_val}")
                context = "\n\n\n".join(context_parts)
            except Exception as e:
                print(f"[Warning] Failed to fetch context from Qdrant: {e}")

        if context:
            user_text = f"Context: {context} \n User Question: {Ask}"
        else:
            user_text = Ask

        message_history.append(
            {"role": "user", "content": user_text}
        )

        while True:
            response = ai.chat.completions.create(
                model = "gpt-5-mini",
                messages = message_history
            )

            result = response.choices[0].message.content
            message_history.append(
                {"role": "assistant", "content": result}
            )

            print(f"\n\033[98mATTEST: {result}\033[0m")
            break

def o_attest_chat(query: str, history: list, collection_name: str = "ATTEST_OPENAI"):
    context = ""
    
    # Only retrieve from Qdrant if we are in Document QA Mode (not "general")
    if collection_name and collection_name != "general":
        try:
            vector_db = get_vector_db(collection_name)
            vector_result = vector_db.similarity_search(query = query, k = 5)
            context_parts = []
            for res in vector_result:
                page_idx = res.metadata.get('page')
                page_val = f"Page {int(page_idx) + 1}" if page_idx is not None else res.metadata.get('page_label', 'Unknown')
                context_parts.append(f"Page Content: {res.page_content}\nPage Number: {page_val}")
            context = "\n\n\n".join(context_parts)
        except Exception as e:
            # Resilient fallback: log warning and continue with empty context
            print(f"[Warning] Failed to retrieve context from Qdrant: {e}")

    formatted_history = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    for msg in history:
        # standard mapping of user/assistant roles
        role_map = {"user": "user", "assistant": "assistant", "model": "assistant"}
        formatted_history.append({"role": role_map.get(msg["role"], msg["role"]), "content": msg["content"]})

    if context:
        user_text = f"Context: {context} \n User Question: {query}"
    else:
        user_text = query

    formatted_history.append(
        {"role": "user", "content": user_text}
    )

    response = ai.chat.completions.create(
        model = "gpt-4o-mini",
        messages = formatted_history
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    o_attest()
