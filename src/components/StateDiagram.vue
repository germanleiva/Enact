<template>
    <svg width="960px" height="500px" @mousedown="canvasMouseDown" @mousemove="canvasMouseMove"  @mouseup="canvasMouseUp" @dblclick="canvasDoubleClick">
        <!--define arrow markers for graph links-->
        <defs>
            <marker id="end-arrow" viewBox="0 -5 10 10" refX="3" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0,-5L10,0L0,5" fill="#000">
                </path>
            </marker>
            <marker id="start-arrow" viewBox="0 -5 10 10" refX="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M10,-5L0,0L10,5" fill="#000">
                </path>
            </marker>
        </defs>
        <!--line displayed when dragging new nodes-->
        <path class="dragline" v-if="startState != undefined" :d="'M' + startState.x + ',' + startState.y + 'L' + dragLineEnd.x + ',' + dragLineEnd.y"></path>

        <transition :transition="eachTransition" v-for="eachTransition in transitions" :key="eachTransition.id"></transition>
        <!-- <path :id="key" class="transition" :d="computeTransitionPath(eachTransition)"></path> -->

        <g v-for="eachState in states" :key="eachState.name" :class="{ state: true, selected: eachState.isSelected, hover: eachState.isHovered }" :transform="'translate(' + [eachState.x, eachState.y] + ')'" >
            <circle r="50" class="outer" @mousedown="mouseDownOnOuterCircle(eachState)">
            </circle>
            <circle r="40" class="inner" @mousedown="mouseDownOnInnerCircle(eachState,$event)" @mouseup="mouseUpOnInnerCircle(eachState,$event)" @mouseover="eachState.isHovered = true" @mouseout="eachState.isHovered = false">
            </circle>
            <text text-anchor="middle" y="4">{{eachState.name}}</text>
            <title>{{eachState.name}}</title>
        </g>
        <rect v-if="selectionRectangle != undefined" class="selection" :rx="selectionRectangle.rx"  :ry="selectionRectangle.ry"  :x="selectionRectangle.x"  :y="selectionRectangle.y"  :width="selectionRectangle.width" :height="selectionRectangle.height"></rect>
    </svg>
</template>

<script>

import Transition from './StateTransition.vue'

var radius = 40;

export default {
    name: 'state-machine',
    props: {
      states: {
        type: Array,
        default: []
      }
    },
    components: {
        Transition
    },
    data() {
        return {
            startState: undefined,
            dragLineEnd: undefined,
            endState: undefined,
            previousPosition: {x:0,y:0},
            selectionRectangle: undefined,
            draggedState: undefined,
            draggedTransition: undefined
        }
    },
    computed: {
        transitions: function () {
            return this.states.reduce(function (initial, state) {
                return initial.concat(
                    state.transitions.map(function (transition) {
                        return { id: transition.id, source: state, target: transition.target };
                    })
                );
            }, []);
        }
    },
    methods: {
        polarToCartesian: function (centerX, centerY, radius, angleInDegrees) {
          var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

          return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
          };
        },
        getCentroid: function (d){
            // document.getElementById("popo").getPointAtLength(document.getElementById("popo").getTotalLength()/2)

            var pathEl   = document.getElementById(d.id)
            if (pathEl) {
                var midpoint = pathEl.getPointAtLength(pathEl.getTotalLength()/2);
                return midpoint
            }

            return {x:0,y:0}
        },
        // http://www.dashingd3js.com/svg-paths-and-d3js
        computeTransitionPath: /*d3.svg.diagonal.radial()*/function (d) {
            // var deltaX = d.target.x - d.source.x,
            //     deltaY = d.target.y - d.source.y,
            //     dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            //     normX = deltaX / dist,
            //     normY = deltaY / dist,
            //     sourcePadding = radius + 2,//d.left ? 17 : 12,
            //     targetPadding = radius + 6,//d.right ? 17 : 12,
            //     sourceX = d.source.x + (sourcePadding * normX),
            //     sourceY = d.source.y + (sourcePadding * normY),
            //     targetX = d.target.x - (targetPadding * normX),
            //     targetY = d.target.y - (targetPadding * normY);
            // return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
            let x1 = d.source.x,
              y1 = d.source.y,
              x2 = d.target.x,
              y2 = d.target.y,
              dx = x2 - x1,
              dy = y2 - y1,
              dr = Math.sqrt(dx * dx + dy * dy),

              // Defaults for normal edge.
              drx = dr,
              dry = dr,
              xRotation = 0, // degrees
              largeArc = 0, // 1 or 0
              sweep = 1; // 1 or 0

              // Self edge.
              if ( x1 === x2 && y1 === y2 ) {
                // Fiddle with this angle to get loop oriented.
                xRotation = -45;

                // Needs to be 1.
                largeArc = 1;

                // Change sweep to change orientation of loop.
                //sweep = 0;

                // Make drx and dry different to get an ellipse
                // instead of a circle.
                drx = 40;
                dry = 30;

                // For whatever reason the arc collapses to a point if the beginning
                // and ending points of the arc are the same, so kludge it.
                x2 = x2 + 1;
                y2 = y2 + 1;

                // x2 += drx - 5;
                // y2 += dry - 5;
              } else {
                // x2 -= 30
                // y2 -= 30
              }

         return "M" + x1 + "," + y1 + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
        },
        mouseDownOnOuterCircle(aState) {
            if (aState.isSelected) {
              this.startState = aState;
              this.dragLineEnd = {x:aState.x,y:aState.y}
              this.endState = undefined;
            }
        },
        mouseDownOnInnerCircle(aState,event) {
            aState.isSelected = true

            if (this.startState) {
                return;
            }

            this.previousPosition.x = event.pageX
            this.previousPosition.y = event.pageY

            this.draggedState = aState

            //This is to move the state at the end of the list, thus putting on top of all the other states
            //Remove element
            var index = this.states.indexOf(aState);
            if (index > -1) {
                this.states.splice(index, 1);
            }
            //Add element at the end
            this.states.push(aState)
        },
        mouseUpOnInnerCircle(aState,event) {
            this.previousPosition.x = 0
            this.previousPosition.y = 0

            if( this.startState && this.endState) {
                this.startState.transitions.push( { name : "transition name 1", target : this.endState});
            }

            this.startState = undefined
            this.dragLineEnd = undefined
            this.draggedState = undefined
        },
        canvasMouseDown(event) {
            if( !event.shiftKey) {
                for (let eachState of this.states) {
                    if (eachState != this.draggedState)
                        eachState.isSelected = false
                }
                return
            }
            this.selectionRectangle = {rx:6,ry:6,x:event.pageX,y:event.pageY,width:0,height:0}
        },
        canvasMouseMove(event) {
            if( this.selectionRectangle) {
                let move = {x: event.pageX - this.selectionRectangle.x , y: event.pageY - this.selectionRectangle.y }

                if( move.x < 1 || (move.x*2<this.selectionRectangle.width)) {
                    this.selectionRectangle.x = event.pageX;
                    this.selectionRectangle.width -= move.x;
                } else {
                    this.selectionRectangle.width = move.x;
                }

                if( move.y < 1 || (move.y*2<this.selectionRectangle.height)) {
                    this.selectionRectangle.y = event.pageY;
                    this.selectionRectangle.height -= move.y;
                } else {
                    this.selectionRectangle.height = move.y;
                }

                // deselect all temporary selected state objects
                for (let eachState of this.states) {
                    // inner circle inside selection frame
                    eachState.isSelected = false

                    //xInside && yInside
                    if (eachState.x-radius>=this.selectionRectangle.x && eachState.x+radius<=this.selectionRectangle.x+this.selectionRectangle.width &&
                        eachState.y-radius>=this.selectionRectangle.y && eachState.y+radius<=this.selectionRectangle.y+this.selectionRectangle.height) {
                        eachState.isSelected = true
                    }
                }
            } else if (this.startState) {
                //update drag line
                this.dragLineEnd.x = event.pageX
                this.dragLineEnd.y = event.pageY

                for (let eachState of this.states) {
                    if (eachState.isHovered) {
                        this.endState = eachState;
                        continue;
                    }
                }

            } else if (this.draggedState || this.draggedTransition) {
                let draggedObject = this.draggedState || this.draggedTransition;

                draggedObject.x += event.pageX - this.previousPosition.x;
                draggedObject.y += event.pageY - this.previousPosition.y;

                this.previousPosition.x =  event.pageX
                this.previousPosition.y =  event.pageY
            }
        },
        canvasMouseUp(event) {
            this.selectionRectangle = undefined
            this.draggedTransition = undefined
        },
        canvasDoubleClick(event) {
            this.states.push( { x : event.pageX, y : event.pageY, name : "new state", isSelected:false, isHovered: false, transitions : [] });
        }
    }
}

</script>

<style scoped>
/* #app {
   font-family: 'Avenir', Helvetica, Arial, sans-serif;
   -webkit-font-smoothing: antialiased;
   -moz-osx-font-smoothing: grayscale;
   text-align: center;
   color: #2c3e50;
   margin-top: 60px;
 }*/

rect.selection {
    stroke: gray;
    stroke-dasharray: 4px;
    stroke-opacity: 0.5;
    fill: transparent;
}

g.state circle {
    stroke: gray;
    cursor: pointer;
}

g.state circle.inner {
    fill: white;
}

g.state.hover circle.inner {
    fill: aliceblue;
}

g.state circle.outer {
    stroke-width: 0px;
    stroke-dasharray: 4px;
    stroke-opacity: 0.5;
    fill: transparent;
}

g.state.selected circle.outer {
    stroke-width: 1px;
}

g.state text {
    font: 12px sans-serif;
    font-weight: bold;
    pointer-events: none;
}

path.transition {
    fill: none;
    stroke: #000;
    stroke-width: 1px;
    cursor: default;
    marker-mid: url("#end-arrow");
    /*marker-segment: url(#end-arrow); NOT YET IMPLEMENTED :@*/
}

path.dragline {
    fill: none;
    stroke: #000;
    stroke-width: 1px;
    cursor: default;
    marker-end: url(#end-arrow);
}

path.dragline {
    pointer-events: none;
}

/* disable text selection */
svg *::selection {
    background: transparent;
}

svg *::-moz-selection {
    background: transparent;
}

svg *::-webkit-selection {
    background: transparent;
}
</style>
