<template>
    <div id="toolbar">
        <div class="control is-grouped">
            <a class="button is-primary is-alone is-disabled" id="title">ENACT</a>
            <p class="control has-addons">
                <a class="button" :class="{'is-active':toolbarState.selectionMode}" v-on:click="selectionSelected"><span class="icon is-small"><i class="fa fa-mouse-pointer"></i></span></a>
                <a class="button" :class="{'is-active':toolbarState.drawMode}" v-on:click="drawSelected"><span class="icon is-small"><i class="fa fa-pencil-square-o"></i></span></a>
            </p>
            <a class="button" v-on:click="measureSelected" :class="{'is-active':toolbarState.measureMode}"><span class="icon is-small"><i class="fa fa-link"></i></span> </a>
            <input type="color" v-on:change="changeColor()" id="color-picker" class="button" v-model="toolbarState.currentColor">
            <a class="button is-alone" v-on:click="addVisualState"><span class="icon is-small"><i class="fa fa-plus-square-o"></i></span></a>
            <a class="button is-alone" v-on:click="addNewRule"><span class="icon is-small"><i class="fa fa-cubes"></i></span></a>
        </div>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,VisualStateModel,RulePlaceholderModel} from '../store.js'

export default {
  name: 'toolbar',
  data () {
    return {
        toolbarState: globalStore.toolbarState
    }
  },
    methods: {
        drawSelected() {
            this.toolbarState.drawMode = true;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = false;
            this.toolbarState.cursorType = "crosshair";
        },
        selectionSelected() {
            this.toolbarState.drawMode = false;
            this.toolbarState.selectionMode = true;
            this.toolbarState.measureMode = false;
            this.toolbarState.cursorType = "default";
        },
        measureSelected() {
            this.toolbarState.drawMode = false;
            this.toolbarState.selectionMode = false;
            this.toolbarState.measureMode = true;
            globalStore.deselectAllShapes()
            this.toolbarState.cursorType = "default";
        },
        changeColor() {
            this.$parent.changeColorOfSelectedShapes({
                'background-color': this.toolbarState.currentColor
            });
        },
        addVisualState() {
            var newVisualState = new VisualStateModel()

            if (globalStore.visualStates.length > 0) {
                let previousVisualState = globalStore.visualStates.last();

                for (let shapeKey in previousVisualState.shapesDictionary) {
                    newVisualState.addNewShape(previousVisualState.shapesDictionary[shapeKey]);
                }

                newVisualState.importMeasuresFrom(previousVisualState);

                //TODO: Should we send didCreateShape?

                previousVisualState.nextState = newVisualState;
                newVisualState.previousState = previousVisualState;
            }

            // outputAreaVM.$el.appendChild(newVisualState.$el)

            globalStore.visualStates.push(newVisualState);
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

</style>