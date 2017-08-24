<template>
    <div id="toolbar">
        <input id="file-input" type="file" name="name" style="display: none;" @change="fileLoaded" value="./savedProjects/example.json"/>
        <div class="control is-grouped">
            <a class="button is-primary is-alone is-disabled" title="A Tool to Create Interaction" id="title">ENACT</a>
            <p class="control has-addons">

                <a class="button" title="Open Project" v-on:click="openFile"><span class="icon is-small"><i class="fa fa-folder-open-o"></i></span></a>
                <a class="button" title="Save Project" v-on:click="saveFile"><span class="icon is-small"><i class="fa fa-floppy-o "></i></span></a>
            </p>

            <p class="control has-addons">
                <a class="button" title="Selection" :class="{'is-active':toolbarState.selectionMode}" v-on:click="selectionSelected"><span class="icon is-small"><i class="fa fa-mouse-pointer"></i></span></a>
                <a class="button" title="Create Rectangle" :class="{'is-active':toolbarState.rectangleMode}" v-on:click="drawSelected"><span class="icon is-small"><i class="fa fa-square-o"></i></span></a>
                <a class="button" title="Create Circle" :class="{'is-active':toolbarState.circleMode}" v-on:click="circleSelected"><span class="icon is-small"><i class="fa fa-circle-thin"></i></span></a>
                <a class="button" title="Create Polygon" v-on:click="polygonSelected" :class="{'is-active':toolbarState.polygonMode}"><span class="icon is-small"><i class="fa fa-star-o"></i></span> </a>
                <a class="button" title="Create Line" v-on:click="lineSelected" :class="{'is-active':toolbarState.lineMode}"><span class="icon is-small"><i class="fa fa-pencil"></i></span> </a>
            </p>
            <a class="button is-alone" title="Create Measure" v-on:click="measureSelected" :class="{'is-active':toolbarState.measureMode}"><span class="icon-ruler"></span></a>
            <input type="color" title="Color Picker" v-on:change="changeColor()" id="color-picker" class="button" v-model="currentColor">
        </div>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus, InputEvent, VisualStateModel} from '../store.js'

export default {
  name: 'toolbar',
  data () {
    return {
        toolbarState: globalStore.toolbarState,
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
        },
        openFile(){
            let fileInput = document.getElementById('file-input');
            fileInput.value = "";
            fileInput.click();
        },
        fileLoaded(e) {
            let file = document.getElementById('file-input').files[0]

            let jsonType = /^application\/json/;

            if (!jsonType.test(file.type)) {
              return
            }

            let reader = new FileReader();
            reader.onabort = e => console.log ("file reader aborted");
            reader.onerror = e => alert("There was an error while reading this file");
            reader.onload = e => {
                console.log("ONLOAD")

                let json = JSON.parse(e.target.result);

                //Delete everything first
                Array.from(globalStore.visualStates).reverse().forEach(vs => {
                    vs.deleteYourself();
                    globalStore.visualStates.remove(vs)
                })
                globalStore.deviceVisualState.deleteYourself();
                globalStore.deviceVisualState = new VisualStateModel()

                Array.from(globalStore.inputEvents).forEach(inputEvent => {
                    inputEvent.deleteYourself()
                    globalStore.inputEvents.remove(inputEvent)
                })
                globalBus.$emit("DELETE-CODE");
                globalStore.stateMachine.deleteYourself();

                globalStore.socket.emit('message-from-desktop', { type: "CLEAN", message: {} })

                //Load everything

                globalStore.shapeCounter = json.shapeCounter;
                globalStore.measureCounter = json.measureCounter;
                globalStore.stateCounter = json.stateCounter;
                globalStore.transitionCounter = json.transitionCounter;
                globalStore.functionCounte = json.functionCounter;

                globalStore.toolbarState.currentColor = json.currentColor;

                for (let eventDesc of json.inputEvents) {
                    globalStore.inputEvents.push(new InputEvent(eventDesc))
                }

                //We create all the visual states
                let createdVisualStates = []
                for (let vsDesc of json.visualStates) {
                    let newVisualState = globalStore.addVisualState()

                    newVisualState.currentInputEventIndex = vsDesc.currentInputEventIndex
                    createdVisualStates.push(newVisualState)
                }
                //Only after all the visual states are created we add shapes/measures/etc
                for (let i=0;i<json.visualStates.length;i++) {
                    let vsDesc = json.visualStates[i]
                    let newVisualState = createdVisualStates[i]
                    for (let shapeKey in vsDesc.shapes) {
                        let shapeDesc = vsDesc.shapes[shapeKey]
                        let newShape = newVisualState.shapeFor(shapeKey)
                        if (!newShape) {
                            newShape = newVisualState.addNewShape(shapeDesc.type,shapeKey)
                            newShape.fromJSON(shapeDesc)

                            if (newVisualState.nextState) {
                                newVisualState.nextState.didCreateShape(newShape, newVisualState);
                            }

                            if (globalStore.visualStates[0] === newVisualState) {
                                globalStore.newShapeCreated(newShape);
                            }
                        } else {
                            newShape.fromJSON(shapeDesc)
                        }
                    }
                    for (let measureDesc of vsDesc.measures) {
                        newVisualState.addNewMeasureUntilLastState(measureDesc.idCount,measureDesc.from.type, measureDesc.from.id, measureDesc.from.handler, measureDesc.to.type, measureDesc.to.id, measureDesc.to.handler)
                    }
                }

                globalStore.stateMachine.fromJSON(json.stateMachine)
            };
            reader.readAsText(file);
        },
        saveFile(){
            //http://s2.quickmeme.com/img/31/3121eb7d9f72877ae27bf1c99be2c79de4c0e9dd4755a89956047efdc95efbcd.jpg

            //Let's save all the visualStates

            let jsonFile = {
                shapeCounter:globalStore.shapeCounter,
                measureCounter:globalStore.measureCounter,
                stateCounter:globalStore.stateCounter,
                transitionCounter:globalStore.transitionCounter,
                functionCounter:globalStore.functionCounter
            }

            jsonFile.visualStates = []

            for (let vs of globalStore.visualStates) {
                jsonFile.visualStates.push(vs.toJSON())
            }

            //Let's save all the events

            jsonFile.inputEvents = []
            for (let inputEvent of globalStore.inputEvents) {
                jsonFile.inputEvents.push(inputEvent.leanJSON)
            }

            //Let's save all the code
            jsonFile.stateMachine = globalStore.stateMachine.toJSON()

            //Let's save the currentColor
            jsonFile.currentColor = globalStore.toolbarState.currentColor

            globalStore.socket.emit('message-save-file', { fileName: "example.json", content: jsonFile })

        }
    },
    computed: {
        currentColor: function() {
            return globalStore.toolbarState.currentColor
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