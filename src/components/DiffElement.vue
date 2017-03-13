<template>
    <a draggable="true" v-on:dragstart="drag" class='button' :style="styleObject" v-on:mouseover="mouseOver" v-on:mouseout="mouseOut"><i class='fa' v-bind:class="classObject"></i></a>
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
            cache: false,
            get: function() {
                let propertyName = this.diffData.property.name
                let before = this.diffData.property.before
                let after = this.diffData.property.after
                return {
                    'fa-arrows-h': propertyName == 'translation' && (before.x != after.x) && (before.y == after.y),
                    'fa-arrows-v': propertyName == 'translation' && (before.x == after.x) && (before.y != after.y),
                    'fa-arrows': propertyName == 'translation' && (before.x != after.x) && (before.y != after.y),
                    'fa-expand fa-rotate-135': propertyName == 'scaling' && (before.w == after.w) && (before.h != after.h),
                    'fa-expand fa-rotate-45': propertyName == 'scaling' && (before.w != after.w) && (before.h == after.h),
                    'fa-arrows-alt': propertyName == 'scaling' && (before.w != after.w) && (before.h != after.h),
                    'fa-tint': propertyName == 'backgroundColor',
                    'fa-plus': propertyName == 'added',
                    'fa-minus': propertyName == 'removed',
                }
            }
        },
        styleObject() {
            return {
                backgroundColor: this.diffData.type == 'input' ? 'PeachPuff' : ''
            }
        }
    },
    methods: {
        drag(e) {
            let dataType = "text/" + this.diffData.type

            let cachedData = this.diffData
            let diffDataObject = {visualStateIndex: globalStore.visualStates.indexOf(this.visualStateModel)}
            for (let eachKey in cachedData) {
                diffDataObject[eachKey] = cachedData[eachKey]
            }

            e.dataTransfer.setData(dataType, JSON.stringify(diffDataObject));
        },
        mouseOver(e) {
            this.$parent.didMouseOver(this)
        },
        mouseOut(e) {
            this.$parent.didMouseOut(this)
        }
    }
}
</script>

<style>
</style>