import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.prebuilt import create_react_agent

from tools import web_search, scrape_url

# Load environment variables
load_dotenv()

# Initialize ChatGroq LLM
# Groq API key is automatically picked up from process/system environment by ChatGroq
llm = ChatGroq(
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    temperature=0
)

def build_search_agent():
    """
    Returns a ReAct agent equipped with the web search tool.
    """
    return create_react_agent(model=llm, tools=[web_search])

def build_reader_agent():
    """
    Returns a ReAct agent equipped with the URL web scraping tool.
    """
    return create_react_agent(model=llm, tools=[scrape_url])

# Writer Chain Setup
writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Create highly educational, accurate, and comprehensive reports based on supplied web research."),
    ("human", """Write a detailed, structured research report on the topic: "{topic}".
    
Use the following gathered research content:
{research}

Your report MUST be structured exactly with the following sections:
# Introduction
[Write a comprehensive introduction introducing the topic, background context, and why it is important]

# Key Findings
[Provide a minimum of 3 detailed key findings, each with its own heading, rich descriptions, and clear facts]
- Finding 1: ...
- Finding 2: ...
- Finding 3: ...

# Conclusion
[Summarize the main takeaways, outlook, and forward-looking implications]

# Sources
[A clean list of any URLs or sources referenced in the research]""")
])

writer_chain = writer_prompt | llm | StrOutputParser()

# Critic Chain Setup
critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a sharp and meticulous research critic. Your job is to thoroughly review research reports and provide constructive, high-quality, and objective feedback."),
    ("human", """Review the following research report:

{report}

Analyze it and respond with a review structured exactly like this:
## Score
[X]/10

## Strengths
[List 2-3 specific strengths of the report]

## Areas to Improve
[List 2-3 specific areas of improvement, factual gaps, or formatting tips]

## Verdict
[Provide a punchy, constructive one-line verdict]""")
])

critic_chain = critic_prompt | llm | StrOutputParser()
