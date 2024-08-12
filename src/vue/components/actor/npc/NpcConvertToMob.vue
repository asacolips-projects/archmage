<template>
	<h3>{{ localize('ARCHMAGE.MOOKMOB.title') }}</h3>
	<p>{{ localize('ARCHMAGE.MOOKMOB.description') }}</p>
	<section class="section section-mob-convert flexrow">
		<label><strong>{{ localize('ARCHMAGE.MOOKMOB.label') }}:</strong></label>
		<input type="number" min="2" step="1" v-model="mookCount">
		<button class="button button--confirm" @click="convertToMob" :disabled="mobConversionDisabled" type="button" :data-tooltip="buttonTooltip">
			{{ localize('ARCHMAGE.MOOKMOB.button') }}
		</button>
	</section>
</template>

<script>
import { ref } from 'vue';
import { localize, getActor } from '@/methods/Helpers';

export default {
	name: 'NpcConvertToMob',
	props: ['actor', 'context'],
	setup(props) {
		const mookCount = ref(2)
		return { mookCount, localize }
	},
	computed: {
		mobConversionDisabled() {
			for (const item of this.actor.items) {
				if (item.type !== 'action') continue
				if (item?.system?.attack?.value?.match?.(/\(.*? attacks\)/)) return true // Something is already marked as multiattack
			}
			return false
		},
		buttonTooltip() {
			if (!this.mobConversionDisabled) return undefined
			return localize('ARCHMAGE.MOOKMOB.disabledButtonTooltip')
		}
	},
	methods: {
		async convertToMob(ev) {
			const actor = await getActor(this.actor)
			await actor.mobify(this.mookCount)
		}
	},
}
</script>

<style lang="scss">
.archmage-v2.npc-sheet {
	.section-mob-convert {
		margin: $padding-lg;
		align-items: center;
		gap: 1rem;

		label {
			flex-grow: 0;
			white-space: nowrap;
		}

		button {
			flex-basis: 200px;
		}
	}
}
</style>
