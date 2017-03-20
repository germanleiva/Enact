<template>
    <div id="toolbar">
        <div class="control is-grouped">
            <a class="button is-primary is-alone is-disabled" title="A Tool to Create Interaction" id="title">ENACT</a>
            <p class="control has-addons">
                <a class="button" title="Selection" :class="{'is-active':toolbarState.selectionMode}" v-on:click="selectionSelected"><span class="icon is-small"><i class="fa fa-mouse-pointer"></i></span></a>
                <a class="button" title="Create Rectangle" :class="{'is-active':toolbarState.drawMode}" v-on:click="drawSelected"><span class="icon is-small"><i class="fa fa-pencil-square-o"></i></span></a>
                <a class="button" title="Create Polygon" v-on:click="polygonSelected" :class="{'is-active':toolbarState.polygonMode}"><span class="icon is-small"><i class="fa fa-star-o"></i></span> </a>
            </p>
            <a class="button" title="Create Measure" v-on:click="measureSelected" :class="{'is-active':toolbarState.measureMode}"><span class="icon is-small"><i class="fa fa-link"></i></span> </a>

            <input type="color" title="Color Picker" v-on:change="changeColor()" id="color-picker" class="button" v-model="currentColor">
            <a class="button is-alone" title="Create new State" v-on:click="addVisualState"><span class="icon is-small"><i class="fa fa-plus-square-o"></i></span></a>
            <a class="button is-alone" title="Add new Rule" v-on:click="addNewRule"><span class="icon is-small"><i class="fa fa-cubes"></i></span></a>
        </div>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus,VisualStateModel,RulePlaceholderModel} from '../store.js'

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
        polygonSelected() {
            globalStore.setPolygonMode()
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
        },
        addVisualState() {
            var newVisualState = new VisualStateModel()

            if (globalStore.visualStates.length > 0) {
                let previousVisualState = globalStore.visualStates.last();

                for (let shapeKey in previousVisualState.shapesDictionary) {
                    let shape = previousVisualState.shapesDictionary[shapeKey]
                    newVisualState.addNewShape(shape.type,shapeKey,previousVisualState.shapesDictionary[shapeKey]);
                }

                newVisualState.importMeasuresFrom(previousVisualState);

                //TODO: Should we send didCreateShape?

                previousVisualState.nextState = newVisualState;
                newVisualState.previousState = previousVisualState;
            }
            globalStore.visualStates.push(newVisualState);

            //TODO DRY
            let correspondingIndex = Math.floor(newVisualState.percentageInTimeline / 100 * (globalStore.inputEvents.length -1))
            newVisualState.currentInputEvent = globalStore.inputEvents[correspondingIndex]

        },
        addNewRule() {
            globalStore.ruleCounter++;
            var newRulePlaceholder = new RulePlaceholderModel(globalStore.ruleCounter)

            globalStore.rulesPlaceholders.push(newRulePlaceholder);

            globalStore.socket.emit('message-from-desktop', { type: "NEW_RULE", message: newRulePlaceholder })
        }
    },
    created: function() {
        this.addVisualState();
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