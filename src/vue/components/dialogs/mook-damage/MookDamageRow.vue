<template>
  <div class="flexrow mook-row">
    <img class="mook-img" :src="token.actor.img" alt="Mook Avatar" width="50" height="50"/>
    <span class="mook-name">{{ token.name }}</span>
    <span class="mook-hp">{{ token.actor.system.attributes.hp.value }}</span>
    <div class="form-group mook-damage">
      <input v-if="editable" type="number"
        :name="token.id"
        :data-token-id="token.id"
        :data-value="damageValue"
        :data-group="group"
        v-model="damageValue"
        @input="updateDamage"
        min="0"
        :max="max"
      />
      <span v-else
        :data-token-id="token.id"
        :data-value="damageValue"
        :data-group="group"
      >{{ damageValue }}</span>
    </div>
    <span class="mook-spill">{{ spillover }}</span>
  </div>
</template>

<script setup>
import { computed, ref, reactive, watch, nextTick } from 'vue';
const props = defineProps(['group', 'max', 'token', 'editable', 'damage']);
// console.log('damage', props.damage);

const damageValue = ref(props.damage[props.token._id].damage ?? 0);

function updateDamage() {
  if (damageValue.value > Number(props.max)) {
    damageValue.value = Number(props.max);
  }
  props.damage[props.token._id].actual = damageValue.value;
}

const spillover = computed(() => {
  console.log('damage', damageValue);
  const spill = damageValue.value - Number(props.token.actor.system.attributes.hp.value);
  if (spill > 0) {
    props.damage[props.token._id].spillover = spill;
    return spill;
  }
  else {
    props.damage[props.token._id].spillover = 0;
    return 0;
  }
});

// const damageValue = ref(0);
// const spillover = computed(() => {
//   console.log('foo', props.damage);
//   const dmg = Number(props.damage);
//   const hp = Number(props.token.actor.system.attributes.hp.value);
//   return dmg > 0 ? dmg - hp : 0;
// });
</script>