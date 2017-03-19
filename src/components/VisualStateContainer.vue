<template>
    <div class='visualStateContainer'>
        <visual-state-canvas :visual-state-model="visualStateModel" :is-mirror="false"></visual-state-canvas>
        <div class="diffContainer" @drop="dropMirrorMobile" @dragover="allowDropMirrorMobile">
            <div v-if="nextState != undefined" class='diffBox'>
                <div class="inputDiffBox">
                    <div class='box inputDiffElement' v-for="(diffArray,touchName) in inputDifferencesWithNextState">
                        <div v-if="diffArray.length > 0"> {{touchName}} <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>
                        </div>
                    </div>
                </div>
                <div class="outputDiffBox">
                    <div class='box outputDiffElement' v-for="(diffArray,shapeName) in outputDifferencesWithNextState">
                        <div v-if="diffArray.length > 0"> {{shapeName}} <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>
                        </div>
                    </div>
                </div>
                <div class="measuresDiffBox">
                    <div class='box measureDiffElement' v-for="(diffArray,measureName) in measuresDifferencesWithNextState">
                        <div v-if="diffArray.length > 0"> {{measureName}} <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>
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
    name: 'visual-state-container',
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
                        let comparedTouches = []
                        for (let aTouch of this.currentInputEvent.touches) {
                            comparedTouches.push(aTouch.id)
                            let comparingTouch = this.nextState.currentInputEvent.touchFor(aTouch.id)

                            if (comparingTouch) {
                                for (let eachDiff of aTouch.diffArray(comparingTouch)) {
                                    atIfNone(aTouch.name,[]).push(eachDiff);
                                }
                            } else {
                                atIfNone(aTouch.name,[]).push({id: aTouch.id, name: aTouch.name, type: 'touch', property: {name: "removed", before: undefined, after: aTouch.name } })
                            }
                        }

                        for (let addedTouch of this.nextState.currentInputEvent.touches) {
                            if (comparedTouches.indexOf(addedTouch.id) < 0) {
                                //key not found
                                // result.push('Added Shape ' + nextShapeKey)
                                atIfNone(addedTouch.name,[]).push({id: addedTouch.id, name: addedTouch.name, type: 'touch', property: { name: "added", before: undefined, after: addedTouch.name } })
                            }
                        }
                    } else {
                        //The next state removed the input event or didn't set one
                        console.log("another WERID!!!!!")
                    }
                } else {
                    if (this.nextState.currentInputEvent) {
                        //The next state added an input event and I don't have one
                        console.log("another WERID!!!!!")
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
                    let comparingMeasure = this.nextState.measureFor(aMeasure.id)
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
                            atIfNone(comparingShape.name,[]).push(eachDiff);
                        }
                    } else {
                        // result.push('Removed Shape ' + aShape.id)
                        atIfNone(aShape.name,[]).push({id: shapeKey, name: aShape.name, type: 'shape', property: {name: "removed", before: undefined, after: aShape.id } })
                    }
                }
                for (let nextShapeKey in this.nextState.shapesDictionary) {
                    let addedShape = this.nextState.shapesDictionary[nextShapeKey]
                    if (comparedShapesKey.indexOf(nextShapeKey) < 0) {
                        //key not found
                        // result.push('Added Shape ' + nextShapeKey)
                        atIfNone(addedShape.name,[]).push({id: nextShapeKey, name: addedShape.name, type: 'shape', property: { name: "added", before: undefined, after: nextShapeKey } })
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
            if ([...dataType].includes("text/visual-state")) {
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
    display: flex;
    flex-direction: row;
    align-content: center;
    flex-wrap: wrap;
    line-height: 20px;
    min-height: 100px;
    width: 128px;
}
.outputDiffBox {
    margin-top: 3px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: center;
    line-height: 20px;
}
.measuresDiffBox {
    margin-top: 3px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: center;
    line-height: 20px;
}
.inputDiffElement {
    width: 40px;
    text-align: center;
    margin-right: 2px;
    margin-bottom: 2px !important;
    padding: 4px !important;
    background-color: #F5F5F5 !important;
    border: 1px solid #ffffff !important;
    box-shadow: 0 4px 3px rgba(100, 200, 100, 0.1), 0 0 0 1px rgba(100, 100, 100, 0.4) !important;
}
.outputDiffElement {
    width: 40px;
    text-align: center;
    margin-right: 2px;
    margin-bottom: 2px !important;
    padding: 4px !important;
}
.measureDiffElement {
    width: 40px;
    text-align: center;
    margin-right: 2px;
    margin-bottom: 2px !important;
    padding: 4px !important;
    background-color: #E1E1E1 !important;
    border: 1px solid #ffffff !important;
    box-shadow: 0 4px 3px rgba(100, 200, 100, 0.1), 0 0 0 1px rgba(100, 100, 100, 0.4) !important;
}
</style>