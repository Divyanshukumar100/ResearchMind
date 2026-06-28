import streamlit as st
import time
from pipeline import run_research_pipeline

# Configure Streamlit page layout and title
st.set_page_config(
    page_title="ResearchMind | Multi-Agent Research System",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom CSS for dark theme with premium styling
# Colors: Background #111, Card #1a1a1a, Orange #ff8c32, Green #50c878, Text #ecefec
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Syne:wght@400..800&display=swap');

/* Main page configuration */
.main {
    background-color: #0d0d0d;
    color: #f3f4f6;
    font-family: 'DM Sans', sans-serif;
}

/* Custom fonts styling */
h1, h2, h3, .brand-title {
    font-family: 'Syne', sans-serif !important;
    font-weight: 700 !important;
}

code, pre, .mono-text {
    font-family: 'DM Mono', monospace !important;
}

/* Hero elements */
.hero-container {
    padding: 2.5rem 0rem;
    border-bottom: 1px solid #222;
    margin-bottom: 2rem;
    text-align: center;
}

.brand-title {
    font-size: 3.5rem;
    background: linear-gradient(135deg, #ff8c32, #ffb380);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
}

.hero-subtitle {
    font-size: 1.1rem;
    color: #8a8d93;
    font-weight: 300;
    margin-top: 0.5rem;
}

/* Sidebar and general inputs styling */
div[data-baseweb="input"] {
    background-color: #1a1a1a !important;
    border: 1px solid #333 !important;
    border-radius: 8px !important;
}

input {
    color: #f3f4f6 !important;
}

/* Button overrides */
.stButton>button {
    background-color: #ff8c32 !important;
    color: #0d0d0d !important;
    border: none !important;
    font-family: 'Syne', sans-serif !important;
    font-weight: 700 !important;
    border-radius: 8px !important;
    padding: 0.6rem 2rem !important;
    transition: all 0.3s ease !important;
    width: 100%;
}

.stButton>button:hover {
    background-color: #ffaa66 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 50, 0.3);
}

/* Pipeline State Cards */
.pipeline-card {
    background-color: #161616;
    border: 1px solid #262626;
    border-radius: 10px;
    padding: 1.2rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pipeline-card.waiting {
    border-left: 5px solid #444;
}

.pipeline-card.running {
    border-left: 5px solid #ff8c32;
    box-shadow: 0 0 10px rgba(255, 140, 50, 0.15);
}

.pipeline-card.done {
    border-left: 5px solid #50c878;
}

.status-indicator {
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: 'DM Mono', monospace;
    font-weight: bold;
}

.status-waiting {
    background-color: #262626;
    color: #888;
}

.status-running {
    background-color: rgba(255, 140, 50, 0.15);
    color: #ff8c32;
}

.status-done {
    background-color: rgba(80, 200, 120, 0.15);
    color: #50c878;
}

/* Expander background */
.streamlit-expanderHeader {
    background-color: #161616 !important;
    border: 1px solid #262626 !important;
    border-radius: 8px !important;
}

/* Footer styling */
.footer {
    text-align: center;
    padding: 2.5rem 0;
    color: #666;
    font-size: 0.85rem;
    border-top: 1px solid #222;
    margin-top: 4rem;
}
</style>
""", unsafe_allow_html=True)

# Hero Banner Header
st.markdown("""
<div class="hero-container">
    <div class="brand-title">ResearchMind</div>
    <div class="hero-subtitle">Multi-Agent Deep Exploration & Report Synthesis Engine</div>
</div>
""", unsafe_allow_html=True)

# Session State Initialization
if "pipeline_state" not in st.session_state:
    st.session_state.pipeline_state = {
        "step": 0,  # 0: Idle, 1: Searching, 2: Scraping, 3: Writing, 4: Evaluation/Done
        "topic": "",
        "search_results": "",
        "scraped_content": "",
        "report": "",
        "feedback": ""
    }

# Main Grid Layout (2-Column Dashboard)
col_left, col_right = st.columns([1.1, 0.9], gap="large")

with col_left:
    st.markdown("### 🔍 Research Scope")
    st.markdown("Define a topic to trigger a cascading multi-agent analytical pipeline. The system will search, scrape, compose, and critique in real-time.")
    
    topic = st.text_input(
        "Enter Research Topic / Question",
        placeholder="e.g., impact of room-temperature superconductors on quantum computing",
        value=st.session_state.pipeline_state.get("topic", "")
    )
    
    # Check for API Keys in environment for friendly setup messages
    import os
    groq_key = os.getenv("GROQ_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    
    if not groq_key or not tavily_key:
        st.warning("⚠️ Setup Notice: Make sure to add your GROQ_API_KEY and TAVILY_API_KEY into the local `.env` file to fully authorize real-time model requests.")
        
    run_btn = st.button("🚀 Run Research Pipeline")

with col_right:
    st.markdown("### ⚡ Pipeline Monitor")
    
    # Helper to generate HTML state card
    def render_state_card(step_name, description, step_id, current_step):
        if current_step < step_id:
            card_class = "waiting"
            indicator_class = "status-waiting"
            indicator_text = "WAITING"
        elif current_step == step_id:
            card_class = "running"
            indicator_class = "status-running"
            indicator_text = "ACTIVE"
        else:
            card_class = "done"
            indicator_class = "status-done"
            indicator_text = "COMPLETE"
            
        st.markdown(f"""
        <div class="pipeline-card {card_class}">
            <div>
                <strong style="color: #ff8c32; font-family: 'Syne';">{step_name}</strong><br>
                <span style="font-size: 0.85rem; color: #8a8d93;">{description}</span>
            </div>
            <span class="status-indicator {indicator_class}">{indicator_text}</span>
        </div>
        """, unsafe_allow_html=True)

    render_state_card("1. Explorer Agent", "Tavily Web Search & Extraction", 1, st.session_state.pipeline_state["step"])
    render_state_card("2. Reader Agent", "BeautifulSoup4 Web scraping & Extraction", 2, st.session_state.pipeline_state["step"])
    render_state_card("3. Writer Agent", "Report Synthesis & Compilation", 3, st.session_state.pipeline_state["step"])
    render_state_card("4. Critic Agent", "Constructive Evaluation & Score Assessment", 4, st.session_state.pipeline_state["step"])

# Execute the search pipeline if requested
if run_btn and topic:
    # Set status to step 1
    st.session_state.pipeline_state = {
        "step": 1,
        "topic": topic,
        "search_results": "",
        "scraped_content": "",
        "report": "",
        "feedback": ""
    }
    st.rerun()

# Processing the pipeline active states
if st.session_state.pipeline_state["step"] > 0 and st.session_state.pipeline_state["step"] < 5:
    current_step = st.session_state.pipeline_state["step"]
    current_topic = st.session_state.pipeline_state["topic"]
    
    try:
        from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain
        
        # Step 1: Search Agent
        if current_step == 1:
            with st.spinner(f"Agent 1: Querying web indexes for '{current_topic}'..."):
                search_agent = build_search_agent()
                search_input = {
                    "messages": [
                        ("user", f"Perform a web search to gather high-quality information, facts, data points, and top URLs on the topic: '{current_topic}'. Compile a summary of your findings and list the URLs.")
                    ]
                }
                search_response = search_agent.invoke(search_input)
                st.session_state.pipeline_state["search_results"] = search_response["messages"][-1].content
                st.session_state.pipeline_state["step"] = 2
                st.rerun()
                
        # Step 2: Reader Agent (Web scraping)
        elif current_step == 2:
            with st.spinner("Agent 2: Extracting document content from the best selected URL..."):
                reader_agent = build_reader_agent()
                reader_input = {
                    "messages": [
                        ("user", f"Analyze the following web search findings:\n\n{st.session_state.pipeline_state['search_results']}\n\nFrom this content, identify the most authoritative, relevant, and promising URL that warrants deep reading. Use your scrape_url tool to extract its clean text content. Provide the scraped content as your final response.")
                    ]
                }
                reader_response = reader_agent.invoke(reader_input)
                st.session_state.pipeline_state["scraped_content"] = reader_response["messages"][-1].content
                st.session_state.pipeline_state["step"] = 3
                st.rerun()
                
        # Step 3: Writer
        elif current_step == 3:
            with st.spinner("Agent 3: Compiling structured report with sources and findings..."):
                combined_research = (
                    f"--- GATHERED EXPLORATORY SEARCH DATA ---\n{st.session_state.pipeline_state['search_results']}\n\n"
                    f"--- DEEP SCRAPED RESOURCE ---\n{st.session_state.pipeline_state['scraped_content']}"
                )
                report_output = writer_chain.invoke({
                    "topic": current_topic,
                    "research": combined_research
                })
                st.session_state.pipeline_state["report"] = report_output
                st.session_state.pipeline_state["step"] = 4
                st.rerun()
                
        # Step 4: Critic Evaluation
        elif current_step == 4:
            with st.spinner("Agent 4: Critiquing generated report for quality and score..."):
                feedback_output = critic_chain.invoke({
                    "report": st.session_state.pipeline_state["report"]
                })
                st.session_state.pipeline_state["feedback"] = feedback_output
                st.session_state.pipeline_state["step"] = 5
                st.rerun()
                
    except Exception as e:
        st.error(f"❌ Pipeline Execution Error: {str(e)}")
        st.info("Ensure that both TAVILY_API_KEY and GROQ_API_KEY are configured in `.env` and that Groq's rate limits or model availability are functioning.")
        st.session_state.pipeline_state["step"] = 0

# Results section
if st.session_state.pipeline_state["step"] == 5:
    st.markdown("---")
    st.markdown("## 📊 Research Outcomes")
    
    res_col_left, res_col_right = st.columns([1.2, 0.8], gap="large")
    
    with res_col_left:
        st.markdown("### 📝 Generated Research Report")
        st.markdown(st.session_state.pipeline_state["report"])
        
        # Download button for .md file
        st.download_button(
            label="📥 Download Markdown Report",
            data=st.session_state.pipeline_state["report"],
            file_name=f"Research_Report_{st.session_state.pipeline_state['topic'].replace(' ', '_')}.md",
            mime="text/markdown"
        )
        
    with res_col_right:
        st.markdown("### ⚖️ Critic Assessment")
        # Display critic output inside custom panel
        st.markdown(f"""
        <div style="background-color: #161616; border: 1px solid #333; padding: 1.5rem; border-radius: 8px;">
            {st.session_state.pipeline_state['feedback']}
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("---")
        st.markdown("### 🔍 Intermediate Agents Scraping History")
        
        with st.expander("Step 1: Raw Search Output"):
            st.code(st.session_state.pipeline_state["search_results"])
            
        with st.expander("Step 2: Scraped Text Output"):
            st.code(st.session_state.pipeline_state["scraped_content"])

# Footer
st.markdown("""
<div class="footer">
    ResearchMind • Driven by Llama-4-Scout-17b & LangGraph prebuilt ReAct orchestrations • Created with Streamlit and Tavily Search
</div>
""", unsafe_allow_html=True)
