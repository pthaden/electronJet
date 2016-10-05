/* Copyright (c) 2013, 2014, Oracle and/or its affiliates.
All rights reserved.*/
"use strict";
define(function() {

  var DemoForceDirectedLayout = function(layoutContext, optLinkLength, initialTemp) {
    this._layoutContext = layoutContext;
    this._optLinkLength = optLinkLength;
    this._initialTemp = initialTemp;
  };

  //pad factor for the node size
  DemoForceDirectedLayout.PAD_FACTOR = 1.2;
  //initial temperature factor - percent of ideal viewport dimension
  DemoForceDirectedLayout.INIT_TEMP_FACTOR = .25;
  //number of iterations to run
  DemoForceDirectedLayout.ITERATIONS = 200;

  /**
   * Main function that does the force directed layout (Layout entry point)
   * See algorithm in "Graph Drawing by Force-directed Placement" by Thomas M. J. Fruchterman and Edward M. Reingold
   * @param {DvtDiagramLayoutContext} layoutContext object that defines a context for layout call
   */
  DemoForceDirectedLayout.forceDirectedLayout = function(layoutContext)
  {
    //pretend that the layout area is just big enough to fit all the nodes
    var maxBounds = DemoForceDirectedLayout.getMaxNodeBounds(layoutContext);
    var nodeCount = layoutContext.getNodeCount();
    var area = nodeCount * (DemoForceDirectedLayout.PAD_FACTOR * maxBounds.w) * (DemoForceDirectedLayout.PAD_FACTOR * maxBounds.h);
    var initialTemp = DemoForceDirectedLayout.INIT_TEMP_FACTOR * Math.sqrt(area);

    //optimal link length - default is just the size of an ideal grid cell
    var layoutAttrs = layoutContext.getLayoutAttributes();
    var optLinkLength = (layoutAttrs && layoutAttrs["optimalLinkLength"]) ? parseFloat(layoutAttrs["optimalLinkLength"]) : Math.sqrt(area / nodeCount);

    //initialize and run the layout
    var layout = new DemoForceDirectedLayout(layoutContext, optLinkLength, initialTemp);
    layout.layoutNodes();
    layout.layoutLinks();

    //position labels
    layout.positionNodeLabels();
    layout.positionLinkLabels();
  };

  /**
   * Layout nodes
   */
  DemoForceDirectedLayout.prototype.layoutNodes = function () {
    this.initForceDirectedPositions();
    var iter = DemoForceDirectedLayout.ITERATIONS;
    var temp = this._initialTemp;
    for (var i = 0; i < iter; i++) {
      this.runForceDirectedIteration(temp);
      //after each iteration, decrease the temperature - we do it linearly
      temp = this._initialTemp * (1 - (i + 1)/iter);
    }
  };

  /**
   * Reposition nodes using force directed algorithm for a single iteration
   * @param {number} t temperature for the iteration that used to limit node displacement
   */
  DemoForceDirectedLayout.prototype.runForceDirectedIteration = function(t)
  {
    //calculate the repulsive force between each two nodes
    var nodeCount = this._layoutContext.getNodeCount();
    for (var ni = 0; ni < nodeCount; ni++) {
      var node = this._layoutContext.getNodeByIndex(ni);
      node.disp = {'x':0, 'y':0};
      for (var ni2 = 0; ni2 < nodeCount; ni2++) {
        if (ni == ni2)
          continue;
        var node2 = this._layoutContext.getNodeByIndex(ni2);

        var difference = this._subtractVectors(node.getPosition(), node2.getPosition());
        var distance = this._vectorLength(difference);
        var repulsion = (this._optLinkLength * this._optLinkLength) / distance;
        node.disp = this._addVectors(node.disp, this._scaleVector(difference, repulsion / distance ));
      }
    }

    //calculate the attractive force between linked nodes
    var linkCount = this._layoutContext.getLinkCount();
    for (var li = 0; li < linkCount; li++) {
      var link = this._layoutContext.getLinkByIndex(li);
      var node = this._getNodeAtCurrentLevel (link.getStartId());
      var node2 = this._getNodeAtCurrentLevel (link.getEndId());
      if (!node || !node2)
        continue;
      var difference = this._subtractVectors(node.getPosition(), node2.getPosition());
      var distance = this._vectorLength(difference);
      var attraction = (distance * distance) / this._optLinkLength;
      node.disp =  this._subtractVectors(node.disp, this._scaleVector(difference, attraction / distance ) );
      node2.disp = this._addVectors(node2.disp, this._scaleVector(difference, attraction / distance ) );
    }

    //limit node displacement by the temperature t and set the position
    for (var ni = 0; ni < nodeCount; ni++) {
      var node = this._layoutContext.getNodeByIndex(ni);
      this._addGravity(node);
      var distance = this._vectorLength(node.disp);
      var pos = this._addVectors(node.getPosition(), this._scaleVector(node.disp, Math.min(distance, t) / distance));
      node.setPosition(pos);
    }
  };

  /**
   * Adds gravity force that attracts a node to the center, the gravity force does not allow disconnected nodes and branches to be pushed far away from the center
   * @param {DvtDiagramLayoutContextNode} node object that defines node context for the layout
   */
  DemoForceDirectedLayout.prototype._addGravity = function(node) {
    var gravityAdjustment = .2;
    var distance = this._vectorLength(node.getPosition()); //distance from the center (0,0)
    var attraction = (distance * distance) / this._optLinkLength;
    node.disp =  this._subtractVectors(node.disp, this._scaleVector(node.getPosition(), attraction / distance * gravityAdjustment ) );
  };

  /**
   * Initializes node positions - node positions in force directed layout must be initialized such that no
   * two nodes have the same position. Position nodes in a circle.
   */
  DemoForceDirectedLayout.prototype.initForceDirectedPositions = function() {
    var nodeCount = this._layoutContext.getNodeCount();
    var angleStep = 2*Math.PI / nodeCount;
    var radius = this._optLinkLength;
    for (var ni = 0; ni < nodeCount; ni++) {
      var x = radius * Math.cos(angleStep * ni);
      var y = radius * Math.sin(angleStep * ni);
      var node = this._layoutContext.getNodeByIndex(ni);
      node.setPosition({'x':x, 'y':y});
    }
  };

  /**
   * Calculate vector length
   * @param {Object} p An object containing x, y coordinates that represents a vector
   * @return {number} vector length
   */
  DemoForceDirectedLayout.prototype._vectorLength = function(p) {
    return Math.sqrt(p.x * p.x + p.y * p.y);
  };

  /**
   * Scale vector
   * @param {Object} p An object containing x, y coordinates that represents a vector
   * @param {number} scale scale
   * @return {Object} resulting vector - an object containing x, y coordinates
   */
  DemoForceDirectedLayout.prototype._scaleVector = function(p, scale) {
    return {'x':p.x * scale, 'y':p.y * scale};
  };

  /**
   * Adds vectors
   * @param {Object} p1 An object containing x, y coordinates that represents a vector
   * @param {Object} p2 An object containing x, y coordinates that represents a vector
   * @return {Object} resulting vector - an object containing x, y coordinates
   */
  DemoForceDirectedLayout.prototype._addVectors = function(p1, p2) {
    return {'x':p1.x + p2.x, 'y':p1.y + p2.y};
  };

  /**
   * Subtract vectors
   * @param {DvtDiagramPoint} p1 An object containing x, y coordinates that represents a vector
   * @param {DvtDiagramPoint} p2 An object containing x, y coordinates that represents a vector
   * @return {DvtDiagramPoint} resulting vector
   */
  DemoForceDirectedLayout.prototype._subtractVectors = function(p1, p2) {
    return {'x':p1.x - p2.x, 'y':p1.y - p2.y};
  };

  /**
   * Finds a node for the link by the node id. In case of a link that does not connect nodes across containers, that will be a node itself.
   * In case when a link connects nodes across containers, that might be one of the ancestor nodes - the node that has been processed at the current level.
   * @param {string} nodeId id of the node to check
   */
  DemoForceDirectedLayout.prototype._getNodeAtCurrentLevel = function(nodeId) {
    var node;
    do {
      if (!nodeId)
        return null;
      node = this._layoutContext.getNodeById(nodeId);
      nodeId = node.getContainerId();
    } while (!node.disp);
    return node;
  };

  /**
   * Create links
   */
  DemoForceDirectedLayout.prototype.layoutLinks = function () {
    for (var li = 0;li < this._layoutContext.getLinkCount();li++) {
      var link = this._layoutContext.getLinkByIndex(li);
      link.setPoints(this.getEndpoints(link));
    }
  };

  /**
   * Get endpoints for the link
   * @param {DvtDiagramLayoutContextLink} link object  that defines link context for the layout
   * @return {array} an array that contains the start X, Y coordinates and the end X, Y coordinates for the link
   */
  DemoForceDirectedLayout.prototype.getEndpoints = function (link) {
    var n1 = this._layoutContext.getNodeById(link.getStartId());
    var n2 = this._layoutContext.getNodeById(link.getEndId());

    var n1Position = n1.getPosition();
    var n2Position = n2.getPosition();

    var b1 = n1.getContentBounds();
    var b2 = n2.getContentBounds();

    var startX = n1Position.x + b1.x + .5 * b1.w;
    var startY = n1Position.y + b1.y + .5 * b1.h;
    var endX = n2Position.x + b2.x + .5 * b2.w;
    var endY = n2Position.y + b2.y + .5 * b2.h;

    b1 = {'x': n1Position.x + b1.x, 'y': n1Position.y + b1.y, 'w': b1.w, 'h': b1.h};
    b2 = {'x': n2Position.x + b2.x, 'y': n2Position.y + b2.y, 'w': b2.w, 'h': b2.h};
    var startP = this._findLinkNodeIntersection(b1, startX, startY, endX, endY, link.getStartConnectorOffset());
    var endP = this._findLinkNodeIntersection(b2, endX, endY, startX, startY, link.getEndConnectorOffset());
    return [startP.x, startP.y, endP.x, endP.y];
  };

  /**
   * Find a point where a link line intersects the node boundary - use that point as the start or the end connection point
   * @param {Object} rect Object containing x, y, w, h properties that represents the bounds of the node content
   * @param {number} startX x coordinate for the line start
   * @param {number} startY y coordinate for the line start
   * @param {number} endX x coordinate for the line end
   * @param {number} endY y coordinate for the line end
   * @param {number} connOffset the offset of the start connector
   * @return {Object}  An object containing x, y coordinates that represents a point where a link line intersects the node boundary
   */
  DemoForceDirectedLayout.prototype._findLinkNodeIntersection = function (rect, startX, startY, endX, endY, connOffset) {

    var lineAngle = Math.atan2(endY - startY, endX - startX);
    var cornerAngle = Math.atan2(rect.h, rect.w); // rectangle diagonal from top left to right bottom
    var bottomRightAngle = cornerAngle;
    var bottomLeftAngle = Math.PI - bottomRightAngle;
    var topRightAngle =  - bottomRightAngle;
    var topLeftAngle =  - bottomLeftAngle;
    var x = 0, y = 0;
    if (lineAngle >= topLeftAngle && lineAngle <= topRightAngle) {    // side top
      x = rect.x + rect.w * .5 + Math.tan(Math.PI / 2 - lineAngle) * (-rect.h * .5);
      y = rect.y;
    }
    else if (lineAngle <= bottomLeftAngle && lineAngle >= bottomRightAngle) {     // side bottom
      x = rect.x + rect.w * .5 + Math.tan(Math.PI / 2 - lineAngle) * (rect.h * .5);
      y = rect.y + rect.h;
    }
    else if (lineAngle <= bottomRightAngle && lineAngle >= topRightAngle) { // side right
      x = rect.x + rect.w;
      y = rect.y + rect.h * .5 + Math.tan(lineAngle) * (rect.w * .5);
    }
    else {                                                                  //side left
      x = rect.x;
      y = rect.y + rect.h * .5 + Math.tan(lineAngle) * (- rect.w * .5);
    }

    if (connOffset) {
      x += Math.cos(lineAngle) * connOffset;
      y += Math.sin(lineAngle) * connOffset;
    }
    return {'x':x, 'y':y};
  };

  /**
   * Center node label below the node
   */
  DemoForceDirectedLayout.prototype.positionNodeLabels = function () {
    for (var ni = 0; ni < this._layoutContext.getNodeCount();ni++) {
      var node = this._layoutContext.getNodeByIndex(ni);
      var nodeLabelBounds = node.getLabelBounds();
      if (nodeLabelBounds) {
        var nodeBounds = node.getContentBounds();
        var nodePos = node.getPosition();
        var labelX = nodeBounds.x + nodePos.x + .5 * nodeBounds.w;
        var labelY = nodeBounds.y + nodePos.y + nodeBounds.h;
        node.setLabelPosition({'x':labelX, 'y':labelY});
        node.setLabelHalign("center");
      }
    }
  };

  /**
   * Position link label at the link center
   */
  DemoForceDirectedLayout.prototype.positionLinkLabels = function (layoutContext) {
    for (var ni = 0;ni < this._layoutContext.getLinkCount();ni++) {
      var link = this._layoutContext.getLinkByIndex(ni);
      var linkLabelBounds = link.getLabelBounds();
      if (linkLabelBounds) {
        var points = link.getPoints();
        if (points.length >=4) {
          var startX = points[0], endX = points[points.length-2];
          var startY = points[1], endY = points[points.length-1];
          var labelX = startX + .5 * (endX - startX);
          var labelY = startY + .5 * (endY - startY - linkLabelBounds.h);
          link.setLabelPosition({'x':labelX, 'y':labelY});
          link.setLabelHalign("center");
        }
      }
    }
  };

  /**
   * Helper function that finds max node width and height
   * @param {DvtDiagramLayoutContext} layoutContext Object that defines a context for layout call
   * @return {Object} a rectangle as an object containing x, y, w, h properties that represent a node with max width and max height
   */
  DemoForceDirectedLayout.getMaxNodeBounds = function (layoutContext) {
    var nodeCount = layoutContext.getNodeCount();
    var maxW = 0 , maxH = 0;
    for (var ni = 0;ni < nodeCount;ni++) {
      var node = layoutContext.getNodeByIndex(ni);
      var bounds = node.getContentBounds();
      maxW = Math.max(bounds.w, maxW);
      maxH = Math.max(bounds.h, maxH);
    }
    return {'x': 0, 'y': 0, 'w': maxW, 'h': maxH};
  };

  return DemoForceDirectedLayout;
});
