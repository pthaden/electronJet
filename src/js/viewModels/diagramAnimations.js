
define(['ojs/ojcore', 'knockout', 'jquery', 'diagramLayouts/DemoForceDirectedLayout', 'ojs/ojknockout', 'ojs/ojbutton', 'ojs/ojdiagram'],
 function(oj, ko, $, layout) {
  
    function DiagramViewModel() {
      var self = this;
      


      //DVT Diagram Animations cookbook sample
            var colorHandler = new oj.ColorAttributeGroupHandler();
      var groupPrefix = "Category ";
      var uniqueId = 100;
      var nodes = [];
      var links = [];
      self.nodeValues = ko.observableArray(nodes);
      self.linkValues = ko.observableArray(links);


      /**
       * Optional ViewModel method invoked when this ViewModel is about to be
       * used for the View transition.  The application can put data fetch logic
       * here that can return a Promise which will delay the handleAttached function
       * call below until the Promise is resolved.
       * @param {Object} info - An object with the following key-value pairs:
       * @param {Node} info.element - DOM element or where the binding is attached. This may be a 'virtual' element (comment node).
       * @param {Function} info.valueAccessor - The binding's value accessor.
       * @return {Promise|undefined} - If the callback returns a Promise, the next phase (attaching DOM) will be delayed until
       * the promise is resolved
       */
      self.handleActivated = function(info) {

              
           $.getJSON("js/diagramLayouts/animation.json").then(function (data) {
	          if (data) {
	            for (var ni = 0; ni < data.nodes.length; ni++) {
	              var nodeData = data.nodes[ni];
	              nodes.push(createNode(nodeData));
	            }
	            for (var li = 0; li < data.links.length; li++) {
	              var linkData = data.links[li];
	              links.push(createLink(linkData));
	            }
              self.nodeValues(nodes);
              self.linkValues(links);
              console.log("nodeValues", nodes, self.nodeValues());

	          }
	        }
	      );

        };

      

      function createNode(nodeData) {
        return {
          id: nodeData.id,
          group : nodeData.group,
          shortDesc: nodeData.id  + ", " + groupPrefix + nodeData.group,
          icon: {color: colorHandler.getValue(nodeData.group), width: nodeData.size, height: nodeData.size}
        };
      }
      function createLink(linkData) {
        return {
          id: linkData.id,
          shortDesc: linkData.id + ", connects " + linkData.start + " to " + linkData.end,
          startNode: linkData.start,
          endNode: linkData.end
        };
      }
      self.layoutFunc = layout.forceDirectedLayout;
      self.styleDefaults = {
        nodeDefaults: {
          icon: {borderColor:"#444444",borderWidth:.5}},
        linkDefaults: {
          startConnectorType: "none",
          endConnectorType: "arrow"
        }
      };
      self.sizeButtonClick = function(data, event) {
        for (var i = 0; i < nodes.length; i++) {
          var sizeValue = Math.floor(Math.random() * (80 - 20) + 20);
          nodes[i].icon.width = sizeValue;
          nodes[i].icon.height = sizeValue;
        }
        self.nodeValues(nodes);
        return true;
      }
      self.colorButtonClick = function(data, event) {
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].icon.color = colorHandler.getValue(Math.floor(Math.random() * 4));
        }
        self.nodeValues(nodes);
        return true;
      }
      self.addNodeButtonClick = function(data, event) {
        var nodeId = "N" + (uniqueId++);
        var newNode = {
          id: nodeId,
          shortDesc: nodeId + ", Category 4",
          icon: {color: colorHandler.getValue("4"), width: 45, height: 45}
        };
        if (nodes.length > 0) {
          var linkId = "L" + (uniqueId++);
          var startNode = Math.floor(Math.random() * nodes.length);
          var newLink = {
            id: linkId,
            shortDesc: linkId + ", connects " + nodes[startNode].id + " to " + nodeId,
            startNode: nodes[startNode].id,
            endNode: nodeId
          }
          links.push(newLink);
          self.linkValues(links);
        }
        nodes.push(newNode);
        self.nodeValues(nodes);
        console.log("nodeValues", self.nodeValues());
        return true;
      }
      self.removeNodeButtonClick = function(data, event) {
        var node = nodes[nodes.length-1];
        nodes.splice(nodes.length-1, 1);
        for (var li = links.length-1; li >= 0; li--){
          var link = links[li];
          if (link.startNode === node.id || link.endNode === node.id) {
            links.splice(li, 1);
          }
        }
        self.nodeValues(nodes);
        self.linkValues(links);
        return true;
      }
    }

    /*
     * Returns a constructor for the ViewModel so that the ViewModel is constrcuted
     * each time the view is displayed.  Return an instance of the ViewModel if
     * only one instance of the ViewModel is needed.
     */
    return new DiagramViewModel();
  }
);
