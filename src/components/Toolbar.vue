<template>
    <div id="toolbar">
        <div class="control is-grouped">
            <a class="button is-primary is-alone is-disabled" title="A Tool to Create Interaction" id="title">ENACT</a>
            <p class="control has-addons">
                <a class="button" title="Selection" :class="{'is-active':toolbarState.selectionMode}" v-on:click="selectionSelected"><span class="icon is-small"><i class="fa fa-mouse-pointer"></i></span></a>
                <a class="button" title="Create Rectangle" :class="{'is-active':toolbarState.rectangleMode}" v-on:click="drawSelected"><span class="icon is-small"><i class="fa fa-square-o"></i></span></a>
                <a class="button" title="Create Circle" :class="{'is-active':toolbarState.circleMode}" v-on:click="circleSelected"><span class="icon is-small"><i class="fa fa-circle-o"></i></span></a>
                <a class="button" title="Create Polygon" v-on:click="polygonSelected" :class="{'is-active':toolbarState.polygonMode}"><span class="icon is-small"><i class="fa fa-star-o"></i></span> </a>
                <a class="button" title="Create Line" v-on:click="lineSelected" :class="{'is-active':toolbarState.lineMode}"><span class="icon is-small"><i class="fa fa-pencil"></i></span> </a>
            </p>
            <a class="button is-alone" title="Create Measure" v-on:click="measureSelected" :class="{'is-active':toolbarState.measureMode}"><span class="icon is-small"><i class="fa fa-link"></i></span> </a>

            <input type="color" title="Color Picker" v-on:change="changeColor()" id="color-picker" class="button" v-model="currentColor">
        </div>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus} from '../store.js'

export default {
  name: 'toolbar',
  data () {
    return {
        toolbarState: globalStore.toolbarState,
        currentColor: '#1a60f3'
    }
  },
    methods: {
        drawSelected() {
            globalStore.setRectangleMode()
        },
        circleSelected() {
            globalStore.setCircleMode()
        },
        polygonSelected() {
            globalStore.setPolygonMode()
        },
        lineSelected() {
            // globalStore.setLineMode()
        },
        selectionSelected() {
            globalStore.setSelectionMode()
        },
        measureSelected() {
            globalStore.setMeasureMode()
            globalStore.deselectAllShapes()
        },
        changeColor(e) {
            globalBus.$emit('changeColorOfSelectedShapes',this.currentColor)
        }
    },
    created: function() {
        globalStore.addVisualState();
    }
}
</script>

<style >
#title{
    opacity: 1 !important;
    margin-right: 20px;
}
.tooltip {
  border-bottom: 1px dotted #000000;
  color: #000000; outline: none;
  cursor: help; text-decoration: none;
  position: relative;
}
.tooltip span {
  margin-left: -999em;
  position: absolute;
}
</style>