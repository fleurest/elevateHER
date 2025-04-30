import os
import networkx as nx
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")

def fetch_edges():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    query = """
    MATCH (a:Person)-[:FRIENDS_WITH|PARTICIPATES_IN]-(b:Person)
    RETURN a.name AS source, b.name AS target
    """
    with driver.session() as session:
        result = session.run(query)
        edges = [(record["source"], record["target"]) for record in result]
    driver.close()
    return edges

def compute_pagerank(edges):
    G = nx.DiGraph()
    G.add_edges_from(edges)
    return nx.pagerank(G)

def upload_scores(pagerank_scores):
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    with driver.session() as session:
        for name, score in pagerank_scores.items():
            session.run("""
                MATCH (p:Person {name: $name})
                SET p.pagerank = $score
            """, name=name, score=score)
    driver.close()

if __name__ == "__main__":
    edges = fetch_edges()
    print(f"Fetched {len(edges)} edges.")
    pr_scores = compute_pagerank(edges)
    print(f"Computed PageRank for {len(pr_scores)} nodes.")
    upload_scores(pr_scores)
    print("PageRank scores uploaded to Neo4j.")
