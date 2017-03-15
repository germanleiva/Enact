<template>
    <div v-bind:style="styleObject">
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus,logger} from '../store.js'

export default {
    name: 'point',
    props: ['measureModel'],
    data: function() {
        return {

        }
    },
    computed: {
        styleObject: function() {
            let size = 10
            return {
                // 'backgroundColor': 'red',
                'position': 'absolute',
                'left': (this.startingX - size/2) + 'px',
                'top': (this.startingY - size/2) +'px',
                'width': size + 'px',
                'height': size + 'px',
                'border': '1px solid #000000',
                'background-color': this.measureModel.highlight?'gray':'blue',
                'border-radius': '5px',
                'pointer-events':'none' //This is a hack to let the mouse event PASS-THROUGH the measure
            }
        },
        startingX: function() {
            let initialX = this.measureModel.initialPoint.x
            if (initialX >= this.measureModel.finalPoint.x) {
                initialX = this.measureModel.initialPoint.x + this.measureModel.deltaX
            }
            return initialX
        },
        startingY: function() {
            let initialY = this.measureModel.initialPoint.y
            if (initialY >= this.measureModel.finalPoint.y) {
                initialY = this.measureModel.initialPoint.y + this.measureModel.deltaY
            }
            return initialY
        },
    },
    destroyed: function() {
        console.log("WE DESTROYED MEASURE POINT")
    },
    methods: {
        handlerFor(x,y) {
            return undefined
        }
    }
}
</script>