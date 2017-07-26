<template>
    <g>
    <path class="transition" :d="computeTransitionPathToMiddle"></path>
    <rect :x="middle.x" :y="middle.y" width="20" height="50" fill="rgba(1,0,0,1)" @mousedown.stop="startMovingTransition"/>
    <foreignObject :x="middle.x" :y="middle.y" width="200" height="68">
        <!-- <div xmlns="http://www.w3.org/1999/xhtml"> -->
        <!-- <div>
            <input type="text" id="myInput"/>
        </div> -->
        <rule-placeholder ref="rulesVM" :rule-placeholder-model="aRulePlaceholder"></rule-placeholder>
    </foreignObject>
    <path class="transition" :d="computeTransitionPathFromMiddle"></path>
    </g>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, RulePlaceholderModel} from '../store.js'
import RulePlaceholder from './RulePlaceholder.vue'

export default {
    name: 'transition',
    props: ["transition"],
    components: {
        RulePlaceholder
    },
    data() {
        return {
            middle: {x: 30, y: 30 },
            aRulePlaceholder: new RulePlaceholderModel(0)
        }
    },
    computed: {
        computeTransitionPathToMiddle: /*d3.svg.diagonal.radial()*/function () {
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
              // Defaults for normal edge.
              let drx = this.length,
              dry = this.length,
              xRotation = 0, // degrees
              largeArc = 0, // 1 or 0
              sweep = 1, // 1 or 0
              x2 = this.middle.x,
              y2 = this.middle.y;

              // Self edge.
              if ( this.x1 === this.x2 && this.y1 === this.y2 ) {
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

         return "M" + this.x1 + "," + this.y1 + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
        },
        computeTransitionPathFromMiddle: /*d3.svg.diagonal.radial()*/function () {
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
              // Defaults for normal edge.
              let drx = this.length,
              dry = this.length,
              xRotation = 0, // degrees
              largeArc = 0, // 1 or 0
              sweep = 1, // 1 or 0
              x2 = this.x2,
              y2 = this.y2;

              // Self edge.
              if ( this.x1 === this.x2 && this.y1 === this.y2 ) {
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

         return "M" + this.middle.x + "," + this.middle.y + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
        },
        length: function() {
            let dx = this.x2 - this.x1;
            let dy = this.y2 - this.y1;

            return Math.sqrt(dx * dx + dy * dy)
        },
        x1: function() {
            return this.transition.source.x;
        },
        x2: function() {
            return this.transition.target.x;
        },
        y1: function() {
            return this.transition.source.y;
        },
        y2: function() {
            return this.transition.target.y;
        }
    },
    methods: {
        startMovingTransition: function(event) {
            this.$parent.previousPosition.x = event.pageX
            this.$parent.previousPosition.y = event.pageY
            this.$parent.draggedTransition = this.middle
        },
        polarToCartesian: function (centerX, centerY, radius, angleInDegrees) {
          var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

          return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
          };
        }
    }
}

</script>

<style scoped>

path.transition {
    fill: none;
    stroke: #000;
    stroke-width: 1px;
    cursor: default;
    marker-mid: url("#end-arrow");
    /*marker-segment: url(#end-arrow); NOT YET IMPLEMENTED :@*/
}
</style>
