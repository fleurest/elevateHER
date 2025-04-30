import networkx as nx
from neo4j import GraphDatabase
from community import community_louvain  # Louvain algorithm
from dotenv import load_dotenv
import os

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

def detect_communities(edges):
    G = nx.Graph()
    G.add_edges_from(edges)
    partition = community_louvain.best_partition(G)
    return partition

def upload_communities(partition):
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    with driver.session() as session:
        for name, community in partition.items():
            session.run("""
                MATCH (p:Person {name: $name})
                SET p.communityId = $community
            """, name=name, community=community)
    driver.close()

if __name__ == "__main__":
    edges = fetch_edges()
    partition = detect_communities(edge_
