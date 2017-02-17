<template>
    <a draggable="true" v-on:dragstart="drag" class='button' :style="styleObject" v-on:mouseover="mouseOver" v-on:mouseout="mouseOut"><i class='fa' v-bind:class="classObject"></i></a>
</template>

<script>

export default {
    name: 'diff-element',
    props: ['diffData'],
    template: ``,
    data: function() {
        return {}
    },
    computed: {
        classObject: {
            cache: false,
            get: function() {
                return {
                    'fa-arrows-h': this.diffData['translation'] != undefined && (this.diffData['translation'].previousValue.x != this.diffData['translation'].newValue.x) && (this.diffData['translation'].previousValue.y == this.diffData['translation'].newValue.y),
                    'fa-arrows-v': this.diffData['translation'] != undefined && (this.diffData['translation'].previousValue.x == this.diffData['translation'].newValue.x) && (this.diffData['translation'].previousValue.y != this.diffData['translation'].newValue.y),
                    'fa-arrows': this.diffData['translation'] != undefined && (this.diffData['translation'].previousValue.x != this.diffData['translation'].newValue.x) && (this.diffData['translation'].previousValue.y != this.diffData['translation'].newValue.y),
                    'fa-expand fa-rotate-135': this.diffData['scaling'] != undefined && (this.diffData['scaling'].previousValue.w == this.diffData['scaling'].newValue.w) && (this.diffData['scaling'].previousValue.h != this.diffData['scaling'].newValue.h),
                    'fa-expand fa-rotate-45': this.diffData['scaling'] != undefined && (this.diffData['scaling'].previousValue.w != this.diffData['scaling'].newValue.w) && (this.diffData['scaling'].previousValue.h == this.diffData['scaling'].newValue.h),
                    'fa-arrows-alt': this.diffData['scaling'] != undefined && (this.diffData['scaling'].previousValue.w != this.diffData['scaling'].newValue.w) && (this.diffData['scaling'].previousValue.h != this.diffData['scaling'].newValue.h),
                    'fa-tint': this.diffData['backgroundColor'] != undefined,
                    'fa-plus': this.diffData['added'] != undefined,
                    'fa-minus': this.diffData['removed'] != undefined,
                }
            }
        },
        styleObject() {
            return {
                backgroundColor: this.diffData['isInput'] ? 'PeachPuff' : ''
            }
        }
    },
    methods: {
        drag(e) {
            let dataType = "text/output"
            if (this.diffData.isInput) {
                dataType = "text/input"
            }
            e.dataTransfer.setData(dataType, JSON.stringify(this.diffData));
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