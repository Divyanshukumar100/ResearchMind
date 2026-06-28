export const codeFiles = {
  tools: `import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tavily import TavilyClient

# Load environment variables
load_dotenv()

# Initialize Tavily client with key passed explicitly
tavily_api_key = os.getenv("TAVILY_API_KEY")
tavily_client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None

def web_search(query: str) -> str:
    """
    Search the web for the given query using Tavily API.
    Returns Title + URL + Snippet for up to 5 results.
    """
    if not tavily_client:
        return "Error: TAVILY_API_KEY not found in environment."
    
    try:
        response = tavily_client.search(query=query, max_results=5)
        results = response.get("results", [])
        
        formatted_results = []
        for res in results:
            title = res.get("title", "No Title")
            url = res.get("url", "No URL")
            snippet = res.get("content", "")[:300]
            formatted_results.append(
                f"Title: {title}\\nURL: {url}\\nSnippet: {snippet}"
            )
        return "\\n----\\n".join(formatted_results)
    except Exception as e:
        return f"Error: {str(e)}"

def scrape_url(url: str) -> str:
    """
    Scrape text of a URL, stripping script/style/nav/footer tags,
    returning clean text[:3000].
    """
    headers = {"User-Agent": "Mozilla/5.0 ..."}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        for element in soup(["script", "style", "nav", "footer"]):
            element.decompose()
        text = soup.get_text(separator="\\n")
        lines = (line.strip() for line in text.splitlines())
        clean_text = "\\n".join(line for line in lines if line)
        return clean_text[:3000]
    except Exception as e:
        return f"Error scraping: {str(e)}"`,

  agents: `import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.prebuilt import create_react_agent
from tools import web_search, scrape_url

load_dotenv()

llm = ChatGroq(
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    temperature=0
)

def build_search_agent():
    return create_react_agent(model=llm, tools=[web_search])

def build_reader_agent():
    return create_react_agent(model=llm, tools=[scrape_url])

writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer..."),
    ("human", "Write report on {topic} using {research}...")
])
writer_chain = writer_prompt | llm | StrOutputParser()

critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a sharp research critic..."),
    ("human", "Review {report}...")
])
critic_chain = critic_prompt | llm | StrOutputParser()`,

  pipeline: `from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain

def run_research_pipeline(topic: str) -> dict:
    state = {"topic": topic, "search_results": "", "scraped_content": "", "report": "", "feedback": ""}
    
    # Step 1: Search Agent
    search_agent = build_search_agent()
    res = search_agent.invoke({"messages": [("user", f"Search for: {topic}")]})
    state["search_results"] = res["messages"][-1].content
    
    # Step 2: Reader Agent
    reader_agent = build_reader_agent()
    res = reader_agent.invoke({"messages": [("user", f"Scrape best URL from: {state['search_results']}")]})
    state["scraped_content"] = res["messages"][-1].content
    
    # Step 3: Writer
    state["report"] = writer_chain.invoke({"topic": topic, "research": state["scraped_content"]})
    
    # Step 4: Critic
    state["feedback"] = critic_chain.invoke({"report": state["report"]})
    
    return state`,

  app: `import streamlit as st
from pipeline import run_research_pipeline

st.set_page_config(page_title="ResearchMind", layout="wide")
st.title("ResearchMind 🤖")

topic = st.text_input("Enter topic")
if st.button("Run Research Pipeline") and topic:
    # Set stepper to running
    # Trigger 4-step sequential execution
    results = run_research_pipeline(topic)
    st.markdown(results["report"])
    st.markdown(results["feedback"])`,

  requirements: `langchain>=0.2.0
langchain-core>=0.2.0
langchain-community>=0.2.0
langchain-groq>=0.1.0
groq>=0.9.0
langgraph>=0.1.0
tavily-python>=0.3.0
beautifulsoup4>=4.12.0
requests>=2.31.0
lxml>=5.0.0
python-dotenv>=1.0.0
streamlit>=1.35.0
aiohttp>=3.9.0
tiktoken>=0.6.0
rich>=13.7.0`,

  env: `TAVILY_API_KEY=your_tavily_key_here
GROQ_API_KEY=your_groq_key_here`
};
