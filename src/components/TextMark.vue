<template>
    <span @mouseover="mouseOver" @mouseout="mouseOut" @dblclick="doubleClick">{{codeToShow}}</span>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'text-mark',
    props: ['textMarkerModel','visualStateId','objectId','propertyName','extraPropertyName'],
    data: function() {
        return {}
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
                let parentVisualState = globalStore.visualStates.find((vs) => vs.name == this.visualStateId)
                let object = parentVisualState.objectFor(this.objectId)
                if (object) {
                    if (this.propertyName) {
                        if (this.extraPropertyName) {
                            return `${object.valueForProperty(this.propertyName)[this.extraPropertyName]}`
                        }
                        return `${JSON.stringify(object.valueForProperty(this.propertyName))}`
                    }
                    return `$.${this.visualStateId}.${this.objectId}`
                }
            }
            if (this.propertyName) {
                if (this.extraPropertyName) {
                    return `$.${this.objectId}.${this.propertyName}.${this.extraPropertyName}`
                }
                return `$.${this.objectId}.${this.propertyName}`
            }
            return `$.${this.objectId}`
        }
    },
    methods: {
        mouseOver: function(e) {
            e.preventDefault()
            e.stopPropagation();
            // this.object.highlight = true
        },
        mouseOut: function(e) {
            e.preventDefault()
            e.stopPropagation();
            // this.object.highlight = false
        },
        doubleClick: function(e) {
            this.textMarkerModel.clear()
        }
    },
    destroyed: function(){
        console.log("TextMark destroyed")
        this.textMarkerModel.clear();
    }
}
</script>

<style scoped>

span {
    padding-left: 5px;
    padding-right: 5px;
    background-color: red;
}

span:hover {
    background-color: yellow;
}


</style>