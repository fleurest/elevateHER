class GraphService {
    constructor(graphModel) {
      this.graphModel = graphModel;
    }
  
    async buildGraph(limit = 100, filterByType = null) {
        console.log('buildGraph called with limit:', limit, '| type:', typeof limit);
        const intLimit = Number.isInteger(limit) ? limit : parseInt(limit, 10);
        const records = await this.graphModel.getAllConnections(intLimit);
      
      
        const nodesMap = new Map();
        const edges = [];
      
        records.forEach(record => {
          const startNode = record.get('n');
          const endNode = record.get('m');
          const rel = record.get('r');
          // skip if filtering and it doesn't match
          if (filterByType && rel.type !== filterByType) {
            return;
          }
      
          const getNode = (node) => {
            const profileImage = node.properties.profileImage;
            return {
              data: {
                id: node.identity.toString(),
                label: node.properties.name || node.labels[0],
                image: (profileImage && profileImage !== 'null' && profileImage !== '')
                  ? profileImage
                  : './images/logo-default-profile.png',
                ...node.properties
              }
            };
          };
      
          if (!nodesMap.has(startNode.identity.toString())) {
            nodesMap.set(startNode.identity.toString(), getNode(startNode));
          }
      
          if (!nodesMap.has(endNode.identity.toString())) {
            nodesMap.set(endNode.identity.toString(), getNode(endNode));
          }
      
          edges.push({
            data: {
              id: rel.identity.toString(),
              source: startNode.identity.toString(),
              target: endNode.identity.toString(),
              label: rel.type.replace(/_/g, ' ').toLowerCase(),
              title: rel.type.replace(/_/g, ' ').toLowerCase()
            }
          });
        });
      
        const nodes = Array.from(nodesMap.values());
        return { nodes, edges };
      }
      
  }
  
  module.exports = GraphService;
  