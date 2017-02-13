<template>
    <div id="outputArea" class="outputArea" v-bind:style='{cursor: cursorType}'>
        <visual-state ref="visualStatesVM" v-for="vs in visualStates" :initial-visual-state-model="vs"></visual-state>
    </div>
</template>
<script>

import {globalStore} from '../store.js'
import VisualState from './VisualState.vue'

export default {
    name: 'output-area',
    data: function() {
        return {
            cursorType: globalStore.cursorType,
            shapeCounter: globalStore.shapeCounter
        }
    },
    components: {
        'visual-state':VisualState
    },
    methods: {
        changeColorOfSelectedShapes: function(cssStyle) {
            for (let each of this.$refs.visualStatesVM) {
                each.changeColorOnSelection(cssStyle);
            }
        },
        moveSelectedShapes(deltaX,deltaY) {
            for (let eachVisualStateVM of this.$refs.visualStatesVM) {
                eachVisualStateVM.moveSelectedShapes(deltaX,deltaY)
            }
        },
        deleteSelectedShapes(){
            for (let eachVisualStateVM of this.$refs.visualStatesVM) {
                eachVisualStateVM.deleteSelectedShapes()
            }
        }
    },
    computed: {
        visualStates: function() {
            return globalStore.visualStates
        }
    }
}
</script>