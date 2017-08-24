<template>
    <svg id="svg" @dblclick.prevent="canvasDoubleClick" width="100%" height="100%" style="background:#ffffff;padding-top:0px;">
        <!--define arrow markers for graph links-->
        <defs>
             <marker id="arrowhead" :viewBox="`0 -${arrowSize/2} ${arrowSize} ${arrowSize}`" :refX="nodeRadius * 2" :refY="nodeRadius/20" orient="auto" :markerWidth="arrowSize" :markerHeight="arrowSize" markerUnits="userSpaceOnUse" overflow="visible">
                <path :d="`M0,-${arrowSize/2}L${arrowSize},0L0,${arrowSize/2}z`" fill="#333">
                </path>
            </marker>
             <marker id="arrowhead-selected" :viewBox="`0 -${arrowSize/2} ${arrowSize} ${arrowSize}`" :refX="nodeRadius * 2" :refY="nodeRadius/20" orient="auto" :markerWidth="arrowSize" :markerHeight="arrowSize" markerUnits="userSpaceOnUse" overflow="visible">
                <path :d="`M0,-${arrowSize/2}L${arrowSize},0L0,${arrowSize/2}z`" fill="#00d1b2">
                </path>
            </marker>
             <marker id="arrowhead-activated" :viewBox="`0 -${arrowSize/2} ${arrowSize} ${arrowSize}`" :refX="nodeRadius * 2" :refY="nodeRadius/20" orient="auto" :markerWidth="arrowSize" :markerHeight="arrowSize" markerUnits="userSpaceOnUse" overflow="visible">
                <path :d="`M0,-${arrowSize/2}L${arrowSize},0L0,${arrowSize/2}z`" fill="#ff0000">
                </path>
            </marker>
             <marker id="selfarrowhead" :viewBox="`0 -${arrowSize/2} ${arrowSize} ${arrowSize}`" :refX="nodeRadius * 2" :refY="nodeRadius/5 - 9" orient="-110" :markerWidth="arrowSize" :markerHeight="arrowSize" markerUnits="userSpaceOnUse" overflow="visible">
                <path :d="`M0,-${arrowSize/2}L${arrowSize},0L0,${arrowSize/2}z`" fill="#333">
                </path>
            </marker>
             <marker id="selfarrowhead-selected" :viewBox="`0 -${arrowSize/2} ${arrowSize} ${arrowSize}`" :refX="nodeRadius * 2" :refY="nodeRadius/5 - 9" orient="-110" :markerWidth="arrowSize" :markerHeight="arrowSize" markerUnits="userSpaceOnUse" overflow="visible">
                <path :d="`M0,-${arrowSize/2}L${arrowSize},0L0,${arrowSize/2}z`" fill="#00d1b2">
                </path>
            </marker>
             <marker id="selfarrowhead-activated" :viewBox="`0 -${arrowSize/2} ${arrowSize} ${arrowSize}`" :refX="nodeRadius * 2" :refY="nodeRadius/5 - 9" orient="-110" :markerWidth="arrowSize" :markerHeight="arrowSize" markerUnits="userSpaceOnUse" overflow="visible">
                <path :d="`M0,-${arrowSize/2}L${arrowSize},0L0,${arrowSize/2}z`" fill="#ff0000">
                </path>
            </marker>
        </defs>
        <!--line displayed when dragging new nodes-->
        <path v-for="eachLink in links" class="link" :class="{selected:eachLink.isSelected, activated:eachLink.isActive}" :marker-end="arrowHeadMaker(eachLink)" :d="arcPath(true, eachLink)" @click.prevent="toggleLink(eachLink)"></path>
        <path v-for="eachLink in links" :id="invisiblePath(eachLink)" class="invis" :d="arcPath(eachLink.source.x < eachLink.target.x,eachLink)"></path>
        <g v-for="eachLink in links">
            <text class="linkLabel" :class="{selected:eachLink.isSelected, activated:eachLink.isActive}" dy="-5" @click.prevent="toggleLink(eachLink)">
                <textPath startOffset="50%" text-anchor="middle" :href="'#'+invisiblePath(eachLink)" syle="fill:#cccccc;font-size:50px">{{eachLink.name}}</textPath>
            </text>
        </g>
        <g v-for="eachNode in nodes" :key="eachNode.id" :transform="'translate(' + eachNode.x + ',' + eachNode.y + ')'" class="node" :class="{selected:eachNode.isSelected, activated:eachNode.isActive}">
            <!-- <circle r="50" class="outer" @mousedown="mouseDownOnOuterCircle(eachNode)"></circle> -->

            <!-- <circle r="40" class="inner" @mousedown="mouseDownOnInnerCircle(eachNode,$event)" @mouseup="mouseUpOnInnerCircle(eachNode,$event)" @mouseover="eachNode.isHovered = true" @mouseout="eachNode.isHovered = false"></circle> -->
            <circle :id="'Node;'+eachNode.id" :r="nodeRadius" @click.prevent="toggleNode(eachNode)"></circle>
            <text class="nodeTextClass" x="20" y=".31em" @click.prevent="toggleNode(eachNode)">{{eachNode.name}}</text>

            <!-- <text text-anchor="middle" y="4">{{eachNode.name}}</text> -->
            <!-- <title>{{eachNode.name}}</title> -->
        </g>
        <path class="dragline" v-if="startState != undefined" :d="dragLinePath"></path>

        <!-- <rect v-if="selectionRectangle != undefined" class="selection" :rx="selectionRectangle.rx"  :ry="selectionRectangle.ry"  :x="selectionRectangle.x"  :y="selectionRectangle.y"  :width="selectionRectangle.width" :height="selectionRectangle.height"></rect> -->
    </svg>
</template>

<script>

var linkDistance = 200;

export default {
    name: 'state-machine',
    props: {
      nodes: {
        type: Array,
        default: []
      },
      links: {
        type: Array,
        default: []
      }
    },
    components: {
    },
    data() {
        return {
            simulation: undefined,
            startState: undefined,
            dragLineEnd: undefined,
            nodeRadius: 20,
            arrowSize: 20
        }
    },
    computed: {
        width() {
            return this.$el.clientWidth
        },
        height() {
            return this.$el.clientHeight
        },
        dragLinePath() {
            if (!this.startState) {
                // debugger;
                return
            }
            return 'M' + this.startState.x + ',' + this.startState.y + 'L' + this.dragLineEnd.x + ',' + this.dragLineEnd.y
        }
    },
    mounted() {
        let vm = this;

        this.simulation = this.$d3.forceSimulation(this.nodes)
            .force("x",this.$d3.forceX(vm.$el.clientWidth/2))
            .force("y",this.$d3.forceY(vm.$el.clientHeight/2))
            .force("collide",this.$d3.forceCollide(this.nodeRadius + 1))
            .force("charge",this.$d3.forceManyBody().strength(-20))
            .force("link",this.$d3.forceLink(this.links)
                // .id(function(aNode) {
                //     return aNode.id
                // })
                .distance(linkDistance)
            )
            // .on("tick",function(e) {
            //     // vm.$forceUpdate
            // }.bind(this))

        // simulation.nodes(this.nodes)
        // simulation.force("link").links(this.links)

        let container = document.querySelector("svg");
        let offsetLeft = this.$el.getBoundingClientRect().left;
        let offsetTop = this.$el.getBoundingClientRect().top;

        function dragsubject() {
            let e = this.$d3.event
            //nodeRadius constraint drag to the nodes and not the rest of the container (e.g edges)
            let result = this.simulation.find(e.x, e.y,this.nodeRadius);
            return result;
        }
        function dragstarted() {
            let e = this.$d3.event
            if (e.sourceEvent.metaKey) {
                this.startState = e.subject
                // debugger;
                this.dragLineEnd = {x:e.x ,y:e.y}
                return
            }
            if (!e.active) this.simulation.alphaTarget(0.3).restart();
            e.subject.fx = e.subject.x;
            e.subject.fy = e.subject.y;
        }

        function dragged() {
            let e = this.$d3.event
            if (this.startState) {
                this.dragLineEnd.x = e.x
                this.dragLineEnd.y = e.y
                return
            }
            e.subject.fx = e.x;
            e.subject.fy = e.y;
        }

        function dragended() {
            let e = this.$d3.event

            if (this.startState) {
                let endState = this.simulation.find(e.x, e.y,this.nodeRadius);

                if (endState) {
                    this.$emit("diagramNewLink",{source:this.startState,target:endState})
                }
                this.dragLineEnd = undefined
                this.startState = undefined
                return;
            }
            if (!e.active) this.simulation.alphaTarget(0);
            e.subject.fy = null;
        }

        this.$d3.select(container).call(this.$d3.drag()
          .container(container)
          .subject(dragsubject.bind(this))
          .on("start", dragstarted.bind(this))
          .on("drag", dragged.bind(this))
          .on("end", dragended.bind(this)));

        //keep nodes on top
        // for (var each of document.body.getElementsByClassName("nodeStrokeClass")) {
        //     var gNode = each.parentNode;
        //     gNode.parentNode.appendChild(gNode);
        // };
    },
    methods: {
        toggleNode(aNode) {
            for (let eachLink of this.links) {
                eachLink.isSelected = false
            }
            for (let eachNode of this.nodes) {
                eachNode.isSelected = eachNode == aNode
                if (eachNode.isSelected) {
                    this.$emit('selectedNode', eachNode)
                }
            }
        },
        toggleLink(aLink) {
            for (let eachNode of this.nodes) {
                eachNode.isSelected = false
            }
            for (let eachLink of this.links) {
                eachLink.isSelected = eachLink == aLink
                if (eachLink.isSelected) {
                    this.$emit('selectedLink', eachLink)
                }
            }
        },
        arrowHeadMaker(eachLink) {
            let name = eachLink.source == eachLink.target ? '#selfarrowhead' : '#arrowhead'
            let suffix = ""
            if (eachLink.isSelected) {
                suffix = "-selected"
            } else if (eachLink.isActive) {
                suffix = "-activated"
            }
            return `url(${name}${suffix})`
        },
        arcPath(leftHand, d) {
            if (!d.source || !d.target) {
                debugger
            }

            var x1 = leftHand ? d.source.x : d.target.x,
                y1 = leftHand ? d.source.y : d.target.y,
                x2 = leftHand ? d.target.x : d.source.x,
                y2 = leftHand ? d.target.y : d.source.y,
                dx = x2 - x1,
                dy = y2 - y1,
                dr = Math.sqrt(dx * dx + dy * dy),
                drx = dr,
                dry = dr,
                sweep = leftHand ? 0 : 1,
                siblings = this.siblingLinks(d.source, d.target),
                siblingCount = siblings.length,
                xRotation = 0,
                largeArc = 0;

                if (dr === 0) {
                    sweep = 0;
                    xRotation = -130;
                    largeArc = 1;
                    drx = 60;
                    dry = 50;
                    x2 = x2 + 1;
                    y2 = y2 + 1;
                }

                if (siblingCount > 1) {
                    // console.log(siblings);
                    var arcScale = this.$d3.scalePoint()
                                        .domain(siblings)
                                        .range([1, siblingCount]);
                    drx = drx/(1 + (1/siblingCount) * (arcScale(d.name) - 1));
                    dry = dry/(1 + (1/siblingCount) * (arcScale(d.name) - 1));
                }

            return "M" + x1 + "," + y1 + "A" + drx + ", " + dry + " " + xRotation + ", " + largeArc + ", " + sweep + " " + x2 + "," + y2;
        },
        siblingLinks(source, target) {
          var siblings = [];
          for(var i = 0; i < this.links.length; ++i){
              if( (this.links[i].source.id == source.id && this.links[i].target.id == target.id) || (this.links[i].source.id == target.id && this.links[i].target.id == source.id) )
                  siblings.push(this.links[i].name);
          };
          return siblings;
        },
        invisiblePath(aLink) {
            return "invis_" + aLink.source.id + "-" + aLink.name + "-" + aLink.target.id;
        },
        canvasDoubleClick(event) {
            this.$emit('diagramNewNode')
        }
        // addNewState(newState) {
        //     // let newState = {id: `${this.nodes.length}`, name: 'new state', x:100, y:100};
        //     newState.x = 100;
        //     newState.y = 100;

        //     this.nodes.push(newState);

        //     //To force an update
        //     this.simulation.nodes(this.nodes)
        // }
        // addNewTransition(newLink) {
        //     // let newLink = {source: this.startState.id, target: endState.id, name: 'unnamed '+this.links.length, isSelected:false}
        //     this.links.push(newLink)

        //     //To force an update
        //     this.simulation.force("link").links(this.links)
        // }
    },
    watch: {
        nodes: function() {
            if (this.simulation) {
                this.simulation.nodes(this.nodes);
            }
        },
        links: function() {
            if (this.simulation) {
                this.simulation.force("link").links(this.links);
            }
        }

    }
}

</script>

<style scoped>

text {
    fill: #333333;
    font-family: futura;
    user-select: none;
}

.node {
    cursor:pointer;
}

.node circle {
    stroke: #333333;
    stroke-width: 1.5px;
    fill:#A2C1CC;
}

.node.selected circle {
    fill:#00d1b2;
    cursor:default;
}

.node.activated circle {
    stroke: #ff0000;
    stroke-width: 2.5px;
    cursor:default;
}

path.link, path.textpath {
    transition: fill, stroke-width linear 0.2s;
    fill: none;
    stroke: #333333;
    stroke-width: 1px;
}

path.link.selected{
    stroke-width: 4px;
    stroke: #00d1b2;
}

path.link.activated{
    stroke-width: 4px;
    stroke: #ff0000;
}

path.invis {
    fill: none;
    stroke-width: 0;
}

.nodeTextClass {
    margin-left-left: 10px;
    font-size: 1.2em;
    cursor: pointer;
}
.nodeTextClass:hover {
    fill: #00d1b2;
}
.selected > .nodeTextClass {
    font-size: 1.3em;
    fill: #00d1b2;
    cursor: default;
}

.activated > .nodeTextClass {
    font-size: 1.3em;
    cursor: pointer;
}

.linkLabel {
    transition: fill, font-size linear 0.2s;
    font-size: 1.2em;
    fill:#333;
    cursor: pointer;
}
.linkLabel:hover{
    fill: #00d1b2;
}

.linkLabel.selected {
    font-size: 1.3em;
    fill: #00d1b2;
    cursor: default;
}

.linkLabel.activated {
    font-size: 1.3em;
    fill: #ff0000;
    cursor: pointer;
}
.dragline {
    fill: none;
    stroke: #333;
    stroke-width: 1px;
}

</style>
