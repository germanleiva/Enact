<template>
    <a draggable="true" v-on:dragstart="dragDiffElement" class="button diff" :style="styleObject" v-on:mouseover.prevent="mouseOver" v-on:mouseout.prevent="mouseOut"><i class='fa' v-bind:class="classObject"><span class="tooltiptext">{{diffTooltipText}}</span>
</i></a>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'diff-element',
    props: ['diffData','visualStateModel'],
    template: ``,
    data: function() {
        return {}
    },
    computed: {
        classObject: {
            // cache: false,
            get: function() {
                let propertyName = this.diffData.property.name
                let before = this.diffData.property.before
                let after = this.diffData.property.after
                return {
                    'fa-arrows-h': (propertyName == 'position' ||  propertyName == 'vertex') && (before.x != after.x) && (before.y == after.y),
                    'fa-arrows-v': (propertyName == 'position' ||  propertyName == 'vertex') && (before.x == after.x) && (before.y != after.y),
                    'fa-arrows': (propertyName == 'position' ||  propertyName == 'vertex') && (before.x != after.x) && (before.y != after.y),
                    'fa-sort': propertyName == 'size' && (before.x == after.x) && (before.y != after.y),
                    'fa-sort fa-rotate-90': propertyName == 'size' && (before.x != after.x) && (before.y == after.y),
                    'fa-arrows-alt': propertyName == 'size' && (before.x != after.x) && (before.y != after.y),
                    'fa-tint': propertyName == 'color',
                    'fa-plus': propertyName == 'added',
                    'fa-minus': propertyName == 'removed',
                }
            }
        },
        styleObject() {
            /*return {
                backgroundColor: this.diffData.type == 'touch' ? 'PeachPuff' : ''
            }*/
        },
        diffTooltipText() {
            // console.log("diffTooltipText >> " + JSON.stringify(this.diffData))
            let prevText = ''
            let nextText = ''

            if (this.diffData.property.before && this.diffData.property.after) {
                prevText = `x:${this.diffData.property.after.x - this.diffData.property.before.x}`
                nextText = `y:${this.diffData.property.after.y - this.diffData.property.before.y}`
            } else {
                if (this.diffData.property.before) {
                    prevText = this.diffData.property.before
                }
                if (this.diffData.property.after) {
                    nextText = this.diffData.property.after
                }
            }

            return prevText + " " + nextText
        }
    },
    methods: {
        dragDiffElement(e) {
            let dataType = "text/diff-" + this.diffData.type

            let cachedData = this.diffData
            let diffDataObject = {visualStateIndex: globalStore.visualStates.indexOf(this.visualStateModel)}
            for (let eachKey in cachedData) {
                diffDataObject[eachKey] = cachedData[eachKey]
            }

            e.dataTransfer.setData(dataType, JSON.stringify(diffDataObject));
            this.mouseOut()

        },
        mouseOver(e) {
            // console.log("mouseOver")
            this.visualStateModel.toggleHighlightForInvolvedElement(this.diffData,true)
        },
        mouseOut(e) {
            // console.log("mouseOut")
            this.visualStateModel.toggleHighlightForInvolvedElement(this.diffData,false)

        }
    }
}
</script>

<style>

.diff {
    width: 30px;
    height: 20px;
}

/* Tooltip container */
.tooltip {
    position: relative;
    display: inline-block;
    border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
}

/* Tooltip text */
.diff .tooltiptext {
    visibility: hidden;
    /*width: 120px;*/
    background-color: black;
    color: #fff;
    text-align: center;
    padding: 5px 5px;
    border-radius: 6px;

    /* Position the tooltip text - see examples below! */
    position: absolute;
    z-index: 1;
    top: 0%;
    left: 120%;

    font-family: Verdana,sans-serif;
    font-size: 1em;
    line-height: 1.5;

    pointer-events: none;
}

/* Show the tooltip text when you mouse over the tooltip container */
.diff:hover .tooltiptext {
    visibility: visible;
}

.diff .tooltiptext::after {
    content: " ";
    position: absolute;
    top: 50%;
    right: 100%; /* To the left of the tooltip */
    margin-top: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent black transparent transparent;
}
</style>