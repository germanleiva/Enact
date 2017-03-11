<template>
    <div id="outputArea" class="outputArea" v-bind:style='{cursor: cursorType}'>
        <visual-state-container ref="visualStatesVM" v-for="vs in visualStates" :visual-state-model="vs"></visual-state-container>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
import VisualStateContainer from './VisualStateContainer.vue'

export default {
    name: 'output-area',
    data: function() {
        return {
            cursorType: globalStore.cursorType,
            shapeCounter: globalStore.shapeCounter
        }
    },
    components: {
        VisualStateContainer
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