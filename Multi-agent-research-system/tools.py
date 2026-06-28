import os
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
        return "Error: TAVILY_API_KEY not found in environment. Please check your .env file."
    
    try:
        response = tavily_client.search(query=query, max_results=5)
        results = response.get("results", [])
        
        formatted_results = []
        for res in results:
            title = res.get("title", "No Title")
            url = res.get("url", "No URL")
            snippet = res.get("content", "")[:300]
            
            formatted_results.append(
                f"Title: {title}\nURL: {url}\nSnippet: {snippet}"
            )
            
        if not formatted_results:
            return "No search results found."
            
        return "\n----\n".join(formatted_results)
        
    except Exception as e:
        return f"Error executing search: {str(e)}"

def scrape_url(url: str) -> str:
    """
    Scrape the text contents of a URL, stripping script/style/nav/footer tags,
    and returning the first 3000 characters.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove unwanted element tags
        for element in soup(["script", "style", "nav", "footer"]):
            element.decompose()
            
        # Get clean text
        text = soup.get_text(separator="\n")
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = "\n".join(chunk for chunk in chunks if chunk)
        
        # Return truncated text
        return clean_text[:3000]
        
    except Exception as e:
        return f"Error scraping URL: {str(e)}"
