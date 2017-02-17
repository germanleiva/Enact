<template>
    <!-- <div v-bind:style="styleObject">
    </div> -->
    <svg :style="styleObject">
        <g fill= "none">
            <path :stroke="measureColor" stroke-width="2" :d="path"/>
        </g>
    </svg>
</template>
<script>

import {globalStore,globalBus,logger} from '../store.js'

export default {
    name: 'measure',
    props: ['measureModel'],
    data: function() {
        return {

        }
    },
    computed: {
        styleObject: function() {
            return {
                // 'backgroundColor': 'red',
                'position': 'absolute',
                'left': this.startingX + 'px',
                'top': this.startingY + 'px',
                'width': Math.max(this.measureModel.width,2) + 'px',
                'height': Math.max(this.measureModel.height,2) + 'px',
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
        measureColor() {
            switch(this.measureModel.fromHandlerName){
                case 'ne':
                    return 'red'
                case 'nw':
                    return 'green'
                case 'se':
                    return 'blue'
                case 'sw':
                    return 'orange'
            }
            return 'red'
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

    }
}
</script>