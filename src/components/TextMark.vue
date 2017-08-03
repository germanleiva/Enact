<template>
    <span v-on:mouseover="mouseOver" v-on:mouseout="mouseOut">{{codeToShow}}</span>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'text-mark',
    props: ['textMarkerModel','visualState','object','propertyName'],
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
            return `${this.object.id}.${this.propertyName}`
        }
    },
    methods: {
        mouseOver: function(e) {
            e.preventDefault()
            e.stopPropagation();
            this.object.highlight = true
        },
        mouseOut: function(e) {
            e.preventDefault()
            e.stopPropagation();
            this.object.highlight = false
        }
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