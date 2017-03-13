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
import _ from 'lodash'

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
        moveSelectedShapes(deltaX,deltaY) {
            for (let eachVisualState of this.visualStates) {
                eachVisualState.moveSelectedShapes(deltaX,deltaY)
            }
        },
        deleteSelectedShapes(){
            for (let eachVisualState of this.visualStates) {
                eachVisualState.deleteSelectedShapes()
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