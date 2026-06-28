import sys
from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain

def run_research_pipeline(topic: str) -> dict:
    """
    Executes the 4-step research pipeline sequentially:
    1. Search Agent: Finds top URLs and information on the topic.
    2. Reader Agent: Scrapes the best URL found for deeper analysis.
    3. Writer Agent: Synthesizes a structured markdown report.
    4. Critic Agent: Audits the report and provides feedback + scores.
    """
    state = {
        "topic": topic,
        "search_results": "",
        "scraped_content": "",
        "report": "",
        "feedback": ""
    }
    
    # -----------------
    # Step 1: Web Search
    # -----------------
    print("\n" + "="*50)
    print("STEP 1: SEARCH AGENT (Web Exploration)")
    print("="*50)
    print(f"Tasking Search Agent to explore resources for topic: '{topic}'...")
    
    search_agent = build_search_agent()
    # Invoke search agent using standard langgraph message input format
    search_input = {
        "messages": [
            ("user", f"Perform a web search to gather high-quality information, facts, data points, and top URLs on the topic: '{topic}'. Compile a summary of your findings and list the URLs.")
        ]
    }
    search_response = search_agent.invoke(search_input)
    
    # The last message of the response is typically the agent's output
    search_output = search_response["messages"][-1].content
    state["search_results"] = search_output
    print("\n[Search Agent Response Summary]:")
    print(search_output[:600] + "...\n(Truncated for console display)")
    
    # -----------------
    # Step 2: Scrape Deep Content
    # -----------------
    print("\n" + "="*50)
    print("STEP 2: READER AGENT (URL Scraping & Reading)")
    print("="*50)
    print("Tasking Reader Agent to identify the most promising resource URL and scrape it...")
    
    reader_agent = build_reader_agent()
    reader_input = {
        "messages": [
            ("user", f"Analyze the following web search findings:\n\n{state['search_results']}\n\nFrom this content, identify the most authoritative, relevant, and promising URL that warrants deep reading. Use your scrape_url tool to extract its clean text content. Provide the scraped content as your final response.")
        ]
    }
    reader_response = reader_agent.invoke(reader_input)
    reader_output = reader_response["messages"][-1].content
    state["scraped_content"] = reader_output
    print("\n[Reader Agent Response Summary]:")
    print(reader_output[:600] + "...\n(Truncated for console display)")
    
    # -----------------
    # Step 3: Writer
    # -----------------
    print("\n" + "="*50)
    print("STEP 3: WRITER AGENT (Drafting Research Report)")
    print("="*50)
    print("Drafting complete report using search summaries and deep-scraped details...")
    
    combined_research = (
        f"--- GATHERED EXPLORATORY SEARCH DATA ---\n{state['search_results']}\n\n"
        f"--- DEEP SCRAPED RESOURCE ---\n{state['scraped_content']}"
    )
    
    report_output = writer_chain.invoke({
        "topic": topic,
        "research": combined_research
    })
    state["report"] = report_output
    print("\n[Writer Agent Completed Draft]")
    
    # -----------------
    # Step 4: Critic
    # -----------------
    print("\n" + "="*50)
    print("STEP 4: CRITIC AGENT (Peer Review & Grading)")
    print("="*50)
    print("Reviewing report quality, objectivity, completeness, and formatting...")
    
    feedback_output = critic_chain.invoke({
        "report": state["report"]
    })
    state["feedback"] = feedback_output
    print("\n[Critic Agent Completed Evaluation]")
    print(feedback_output)
    print("="*50 + "\n")
    
    return state

if __name__ == "__main__":
    print("="*60)
    print("     RESEARCHMIND: MULTI-AGENT RESEARCH PIPELINE")
    print("="*60)
    topic_input = input("Enter a research topic: ").strip()
    if not topic_input:
        print("Error: Topic cannot be empty!")
        sys.exit(1)
        
    results = run_research_pipeline(topic_input)
    print("\nResearch Report successfully written! Review the generated draft and critic score above.")
