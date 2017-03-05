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
        path: function() {
            let pathStartingX = this.measureModel.deltaX < 0 ? this.measureModel.width : 0
            let pathStartingY = this.measureModel.deltaY < 0 ? this.measureModel.height : 0
            return "M"+pathStartingX+ " "+pathStartingY+" l"+this.measureModel.deltaX+" "+this.measureModel.deltaY
        },
        strokeWidth() {
            if (this.measureModel.highlight) {
                return 5
            }
            return 2
        }
    },
    destroyed: function() {
        console.log("WE DESTROYED MEASURE")
    },
    // watch: {
    //     styleObject: function(val) {
    //         if (this.shapeModel()) {
    //             // console.log("IN COMPUTED styleObject the shapeModel().color is "+ this.shapeModel().color)

    //             if (globalStore.visualStates[0] === this.visualState) {
    //                 globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", message: { id: this.shapeModel().id, color: this.shapeModel().color, width: this.shapeModel().width, height: this.shapeModel().height, top: this.shapeModel().top, left: this.shapeModel().left, opacity: this.shapeModel().opacity } })
    //            }
    //         } else {
    //             //I WAS DELETED
    //             console.log("Should i worry? " + this.shapeModelId)
    //         }
    //     }
    // },
    methods: {
        handlerFor(x,y) {
            return undefined
        }
    }
}
</script>