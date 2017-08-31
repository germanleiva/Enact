<template>
    <!-- <span @mouseover="mouseOver" @mouseout="mouseOut" @dblclick="doubleClick" class="marker">{{codeToShow}}<span class="tooltiptext">Tooltip text</span></span> -->
    <span @mouseover="mouseOver" @mouseout="mouseOut" @dblclick="doubleClick" class="marker">{{codeToShow}}</span>

</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'text-mark',
    props: ['visualStateId','objectId','propertyName','extraPropertyName','subExtraPropertyName'],
    data: function() {
        return {
            textMarkerModel: undefined,
        }
    },
    computed: {
        markedSpan() {
            return this.textMarkerModel.lines[0].markedSpans[0];
        },
        from() {
            return this.markedSpan.from
        },
        to() {
            return this.markedSpan.to
        },
        codeToShow() {
            if (this.visualStateId) {
                //Hardcoded value
                if (this.object) {
                    if (this.propertyName) {
                        if (this.extraPropertyName) {
                            if (this.subExtraPropertyName) {
                                return `${this.hardcodedValue}`
                            }
                            return `${this.hardcodedValue}`
                        }
                        return `${this.hardcodedValue}`
                    }
                    return `$.${this.visualStateId}.${this.objectId}`
                }
            }
            if (this.propertyName) {
                if (this.extraPropertyName) {
                    if (this.subExtraPropertyName) {
                        return `$.${this.objectId}.${this.propertyName}.${this.extraPropertyName}.${this.subExtraPropertyName}`
                    }
                    return `$.${this.objectId}.${this.propertyName}.${this.extraPropertyName}`
                }
                return `$.${this.objectId}.${this.propertyName}`
            }
            return `$.${this.objectId}`
        },
        object() {
            let parentVisualState = globalStore.visualStates.find(vs => vs.name == this.visualStateId)
            return parentVisualState.objectFor(this.objectId)
        },
        hardcodedValue() {
            if (this.visualStateId && this.object && this.propertyName) {
                let value = this.object[this.propertyName]
                if (this.extraPropertyName) {
                    value = value[this.extraPropertyName]
                    if (this.subExtraPropertyName) {
                        value = value[this.subExtraPropertyName]
                    }
                }
                return JSON.stringify(value)
            }
            console.log("TextMark >> hardcodedValue")
            abort()
        }
    },
    methods: {
        mouseOver: function(e) {
            e.preventDefault()
            e.stopPropagation();

            this.toggleObjects(true)
        },
        mouseOut: function(e) {
            e.preventDefault()
            e.stopPropagation();

            this.toggleObjects(false)
        },
        toggleObjects: function(boolean) {
            if (this.visualStateId) {
                this.toggleOneObject(this.object,boolean)
            } else {
                for (let eachVS of globalStore.visualStates) {
                    let objectToToggle = eachVS.objectFor(this.objectId)
                    if (objectToToggle) {
                        this.toggleOneObject(objectToToggle,boolean)
                    }
                }
            }
        },
        toggleOneObject: function(anObject,boolean) {
            anObject.highlight = boolean

            switch(this.propertyName) {
                case "position": {
                    anObject.isMoving = boolean
                    anObject.isResizing = false
                    break;
                }
                case "size": {
                    anObject.isMoving = false
                    anObject.isResizing = boolean
                }
            }
        },
        doubleClick: function(e) {
            this.toggleObjects(false)
            this.textMarkerModel.clear()
        }
    },
    mounted: function() {
        if (this.visualStateId && this.object && this.propertyName) {
            globalStore.stateMachine.addHardcodedValueFor({visualStateId:this.visualStateId,objectId:this.objectId,propertyName:this.propertyName,extraPropertyName:this.extraPropertyName,subExtraPropertyName:this.subExtraPropertyName})
        }
    },
    destroyed: function(){
        console.log("TextMark destroyed")
        this.textMarkerModel.clear();
        if (this.visualStateId && this.object && this.propertyName) {
            globalStore.stateMachine.deleteHardcodedValue({visualStateId:this.visualStateId,objectId:this.objectId,propertyName:this.propertyName,extraPropertyName:this.extraPropertyName,subExtraPropertyName:this.subExtraPropertyName})
        }
    }
}
</script>

<style scoped>

.marker {
    display: inline-block;
    position: relative;
/*    padding-left: 5px;
    padding-right: 5px;*/
    background-color: #00d1b2;
    color: white;
}

.marker:hover {
    background-color: #00BD9E;
    color: white;
}

/*.marker .tooltiptext {
    visibility: hidden;
    width: 120px;
    background-color: #555;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 0;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -60px;
    opacity: 0;
    transition: opacity 0.3s;
}

.marker .tooltiptext::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #555 transparent transparent transparent;
}

.marker:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
}*/

</style>