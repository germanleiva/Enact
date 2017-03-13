<template>
    <div class='visualStateContainer'>
        <visual-state-canvas :visual-state-model="visualStateModel" :is-mirror="false"></visual-state-canvas>
        <div class="diffContainer" @drop="dropMirrorMobile" @dragover="allowDropMirrorMobile">
            <div v-if="nextState != undefined" class='diffBox'>
                <div class="inputDiffBox">
                    <div class='box' v-for="(diffArray,touchIndex) in inputDifferencesWithNextState">
                        <div v-if="diffArray.length > 0"> {{'F'+touchIndex}} <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>
                        </div>
                    </div>
                </div>
                <div class="outputDiffBox">
                    <div class='box' v-for="(diffArray,shapeKey) in outputDifferencesWithNextState">
                        <div v-if="diffArray.length > 0"> {{shapeKey}} <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>
                        </div>
                    </div>
                </div>
                <div class="measuresDiffBox">
                    <div class='box' v-for="(diffArray,measureKey) in measuresDifferencesWithNextState">
                        <div v-if="diffArray.length > 0"> {{measureKey}} <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
import DiffElement from './DiffElement.vue'
import VisualStateCanvas from './VisualStateCanvas.vue'

export default {
    name: 'visual-state',
    props: ['visualStateModel'],
    data: function() {
        return {
            isDisplayingDiff: false,
            // showAllInputEvents: false
        }
    },
    components: {
        DiffElement,
        VisualStateCanvas
    },
    computed: {
        currentInputEvent: {
            get: function() {
                return this.visualStateModel.currentInputEvent
            },
            set: function(newValue) {
                this.visualStateModel.currentInputEvent = newValue
            }
        },
        nextState: function() {
            return this.visualStateModel.nextState
        },
        inputDifferencesWithNextState: function() {
            let result = {}

            let atIfNone = function(key,ifNoneValue) {
                if (!result[key]) {
                    result[key] = ifNoneValue
                }
                return result[key]
            }

            if (this.hasNextState) {

                if (this.currentInputEvent) {
                    if (this.nextState.currentInputEvent) {
                        //Both states have an input event
                        if (this.currentInputEvent.touches.length != this.nextState.currentInputEvent.touches.length) {
                            //TODO there's a difference that needs to be informed
                            console.log("another WERID!!!!!")
                        } else {
                            for (let i = 0; i < this.currentInputEvent.touches.length; i++) {
                                if (this.currentInputEvent.touches[i].x != this.nextState.currentInputEvent.touches[i].x || this.currentInputEvent.touches[i].y != this.nextState.currentInputEvent.touches[i].y) {

                                    atIfNone(i,[]).push({id: i, type: 'input', property: { name: "translation" , before: { x: this.currentInputEvent.touches[i].x, y: this.currentInputEvent.touches[i].y }, after: { x: this.nextState.currentInputEvent.touches[i].x, y: this.nextState.currentInputEvent.touches[i].y } } })
                                }
                            }
                        }
                    } else {
                        //The next state removed the input event or didn't set one
                        for (let eachTouch in this.currentInputEvent.touches) {
                            let i = this.currentInputEvent.touches.indexOf(eachTouch)

                            atIfNone(i,[]).push({id: i, type: 'input', property: { name: "removed", before: this.currentInputEvent, after: this.nextState.currentInputEvent } })
                        }

                    }
                } else {
                    if (this.nextState.currentInputEvent) {
                        //The next state added an input event and I don't have one

                        for (let eachTouch in this.nextState.currentInputEvent.touches) {
                            let i = this.nextState.currentInputEvent.touches.indexOf(eachTouch)

                            atIfNone(i,[]).push({id: i, type: 'input', property: { name:"added" , before: this.currentInputEvent, after: this.nextState.currentInputEvent }} );
                        }

                    } else {
                        //Both states don't have an input event
                    }
                }
            }
            return result
        },
        measuresDifferencesWithNextState: function() {
            let result = {}

            let atIfNone = function(key,ifNoneValue) {
                if (!result[key]) {
                    result[key] = ifNoneValue
                }
                return result[key]
            }

            if (this.hasNextState) {
                let comparedMeasuresNames = []
                for (let aMeasure of this.visualStateModel.measures) {
                    let aMeasureName = aMeasure.name
                    comparedMeasuresNames.push(aMeasureName)
                    let comparingMeasure = this.nextState.measureFor(aMeasure)
                    if (comparingMeasure) {
                        for (let eachDiff of aMeasure.diffArray(comparingMeasure)) {
                            atIfNone(aMeasureName,[]).push(eachDiff);
                        }
                    } //else {
                        //There's no point in showing the deleted measures
                        // atIfNone(aMeasureKey,[]).push({id: aMeasureKey, type: 'measure', removed: { previousValue: undefined, newValue: aMeasureKey } })
                    // }
                }

                //There's no point in showing the added measures
                // for (let nextMeasure of this.nextState.measures) {
                //     let nextMeasureKey = nextMeasure.id
                //     if (comparedMeasuresKey.indexOf(nextMeasureKey) < 0) {
                //         //key not found
                //         // result.push('Added Shape ' + nextShapeKey)
                //         atIfNone(nextMeasureKey,[]).push({id: nextMeasureKey, type: 'measure', added: { previousValue: undefined, newValue: nextMeasureKey } })
                //     }
                // }
            }
            return result
        },
        outputDifferencesWithNextState() {
            // console.log("VisualState >> outputDifferencesWithNextState")

            let result = {}

            let atIfNone = function(key,ifNoneValue) {
                if (!result[key]) {
                    result[key] = ifNoneValue
                }
                return result[key]
            }
            if (this.hasNextState) {
                let comparedShapesKey = []
                for (let shapeKey in this.visualStateModel.shapesDictionary) {
                    comparedShapesKey.push(shapeKey)
                    let aShape = this.visualStateModel.shapesDictionary[shapeKey];
                    let comparingShape = this.nextState.shapeFor(shapeKey)
                    if (comparingShape) {
                        for (let eachDiff of aShape.diffArray(comparingShape)) {
                            atIfNone(shapeKey,[]).push(eachDiff);
                        }
                    } else {
                        // result.push('Removed Shape ' + aShape.id)
                        atIfNone(shapeKey,[]).push({id: shapeKey,type: 'output', property: {name: "removed", before: undefined, after: aShape.id } })
                    }
                }
                for (let nextShapeKey in this.nextState.shapesDictionary) {
                    if (comparedShapesKey.indexOf(nextShapeKey) < 0) {
                        //key not found
                        // result.push('Added Shape ' + nextShapeKey)
                        atIfNone(nextShapeKey,[]).push({id: nextShapeKey,type: 'output', property: { name: "added", before: undefined, after: nextShapeKey } })
                    }
                }
            }
            return result
        },
        hasNextState() {
            return this.nextState !== undefined;
        }
    },
    methods: {
        dropMirrorMobile(event) {
            event.preventDefault();
            console.log("dropMirrorMobile")

            //TODO AWFUL!!!
            let currentDeviceVisualState = this.$root.$children[0].deviceVisualState

            globalStore.insertVisualStateAfter(currentDeviceVisualState.shapesDictionary,this.visualStateModel)
        },
        allowDropMirrorMobile(event) {
            var dataType = event.dataTransfer.types;
            console.log("allowDropMirrorMobile >> " + dataType)
            if (dataType == "text/visual-state") {
                event.preventDefault()
            }
        },
        didMouseOver(diffElementVM) {
            this.highlightInvolvedElement(diffElementVM,true)
        },
        didMouseOut(diffElementVM) {
            this.highlightInvolvedElement(diffElementVM,false)
        },
        highlightInvolvedElement(diffElementVM,aBoolean){
            let data = diffElementVM.diffData

            this.visualStateModel.toggleHighlightForInvolvedElement(data.id,aBoolean)
        }
    }
}
</script>
<style>
.inputDiffBox {
    width: 110px;
    height: 200px;
}
.outputDiffBox {

}
.measuresDiffBox {

}
</style>