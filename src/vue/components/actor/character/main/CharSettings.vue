<template>
  <section :class="classes">
    <h2 class="unit-title">{{localize('ARCHMAGE.CHARACTERSETTINGS.settings')}}</h2>
    <section class="sheet-settings grid grid-6col">
      <!-- Main Settings -->
      <div class="unit unit--base-settings">
        <div class="sub-unit sub-unit--base-ac flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.baseAC')}}</strong>
          <input type="number" name="system.attributes.ac.base" v-model="actor.system.attributes.ac.base" :disabled="overrides.includes('system.attributes.ac.base')"/>
        </div>
        <div class="sub-unit sub-unit--base-pd flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.basePD')}}</strong>
          <input type="number" name="system.attributes.pd.base" v-model="actor.system.attributes.pd.base" :disabled="overrides.includes('system.attributes.pd.base')"/>
        </div>
        <div class="sub-unit sub-unit--base-md flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.baseMD')}}</strong>
          <input type="number" name="system.attributes.md.base" v-model="actor.system.attributes.md.base" :disabled="overrides.includes('system.attributes.md.base')"/>
        </div>
        <div class="sub-unit sub-unit--base-hp flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.baseHP')}}</strong>
          <input type="number" name="system.attributes.hp.base" step=".1" v-model="actor.system.attributes.hp.base" :disabled="overrides.includes('system.attributes.hp.base')"/>
        </div>
        <div class="sub-unit sub-unit--base-recoveries flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.baseRecoveries')}}</strong>
          <input type="number" name="system.attributes.recoveries.base" v-model="actor.system.attributes.recoveries.base" :disabled="overrides.includes('system.attributes.recoveries.base')"/>
        </div>
        <div class="sub-unit sub-unit--recovery-dice flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.recoveryDice')}}</strong>
          <input type="text" name="system.attributes.recoveries.dice" v-model="actor.system.attributes.recoveries.dice" :disabled="overrides.includes('system.attributes.recoveries.dice')" placeholder="d8"/>
        </div>
        <div class="sub-unit sub-unit--calculate-max-hp flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.calculateHP')}}</strong>
          <input type="checkbox" name="system.attributes.hp.automatic" v-model="actor.system.attributes.hp.automatic"/>
        </div>
        <div class="sub-unit sub-unit--calculate-max-recoveries flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.calculateRecoveries')}}</strong>
          <input type="checkbox" name="system.attributes.recoveries.automatic" v-model="actor.system.attributes.recoveries.automatic"/>
        </div>
        <div class="sub-unit sub-unit--initiative-adjustment flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.initAdjustment')}}</strong>
          <input type="number" name="system.attributes.init.value" v-model="actor.system.attributes.init.value" :disabled="overrides.includes('system.attributes.init.value')" placeholder="0"/>
        </div>
        <div class="sub-unit sub-unit--initiative-adjustment flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.disengageAdjustment')}}</strong>
          <input type="number" name="system.attributes.disengageBonus" v-model="actor.system.attributes.disengageBonus" :disabled="overrides.includes('system.attributes.disengageBonus')" placeholder="0"/>
        </div>
        <div class="sub-unit sub-unit--attackMod flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.attackMod')}}</strong>
          <input type="number" name="system.attributes.attackMod.value" v-model="actor.system.attributes.attackMod.value" :disabled="overrides.includes('system.attributes.attackMod.value')"/>
        </div>
        <div class="sub-unit sub-unit--critModAtk flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.critModAtk')}}</strong>
          <input type="number" name="system.attributes.critMod.atk.value" v-model="actor.system.attributes.critMod.atk.value" :disabled="overrides.includes('system.attributes.critMod.atk.value')"/>
        </div>
        <div class="sub-unit sub-unit--critModDef flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.critModDef')}}</strong>
          <input type="number" name="system.attributes.critMod.def.value" v-model="actor.system.attributes.critMod.def.value" :disabled="overrides.includes('system.attributes.critMod.def.value')"/>
        </div>
        <div class="sub-unit sub-unit--keyMod flexrow">
          <strong class="unit-subtitle">{{localize('ARCHMAGE.keyMod')}}</strong>
          <select name="system.attributes.keyModifier.mod1" v-model="actor.system.attributes.keyModifier.mod1">
            <option v-for="(option, index) in abilities" :key="index" :value="option.value">{{option.label}}</option>
          </select> /
          <select name="system.attributes.keyModifier.mod2" v-model="actor.system.attributes.keyModifier.mod2">
            <option v-for="(option, index) in abilities" :key="index" :value="option.value">{{option.label}}</option>
          </select>
        </div>
        <div class="sub-unit sub-unit--melee">
          <div class="sub-unit sub-unit--melee-dice flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.meleeWeaponDice')}}</strong>
            <input type="text" name="system.attributes.weapon.melee.dice" v-model="actor.system.attributes.weapon.melee.dice" :disabled="overrides.includes('system.attributes.weapon.melee.dice')" placeholder="d8"/>
          </div>
          <div class="sub-unit sub-unit--shield flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.CHARACTERSETTINGS.shield')}}</strong>
            <input type="checkbox" name="system.attributes.weapon.melee.shield" v-model="actor.system.attributes.weapon.melee.shield"/>
          </div>
          <div class="sub-unit sub-unit--dualwield flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.CHARACTERSETTINGS.dualwield')}}</strong>
            <input type="checkbox" name="system.attributes.weapon.melee.dualwield" v-model="actor.system.attributes.weapon.melee.dualwield"/>
          </div>
          <div class="sub-unit sub-unit--twohanded flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.CHARACTERSETTINGS.twohanded')}}</strong>
            <input type="checkbox" name="system.attributes.weapon.melee.twohanded" v-model="actor.system.attributes.weapon.melee.twohanded"/>
          </div>
          <div class="sub-unit sub-unit--ranged-dice flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.rangedWeaponDice')}}</strong>
            <input type="text" name="system.attributes.weapon.ranged.dice" v-model="actor.system.attributes.weapon.ranged.dice" :disabled="overrides.includes('system.attributes.weapon.ranged.dice')" placeholder="d8"/>
          </div>
          <div class="sub-unit sub-unit--jab-dice flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.jabWeaponDice')}}</strong>
            <input type="text" name="system.attributes.weapon.jab.dice" v-model="actor.system.attributes.weapon.jab.dice" :disabled="overrides.includes('system.attributes.weapon.jab.dice')" placeholder="d6"/>
          </div>
          <div class="sub-unit sub-unit--punch-dice flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.punchWeaponDice')}}</strong>
            <input type="text" name="system.attributes.weapon.punch.dice" v-model="actor.system.attributes.weapon.punch.dice" :disabled="overrides.includes('system.attributes.weapon.punch.dice')" placeholder="d8"/>
          </div>
          <div class="sub-unit sub-unit--kick-dice flexrow">
            <strong class="unit-subtitle">{{localize('ARCHMAGE.kickWeaponDice')}}</strong>
            <input type="text" name="system.attributes.weapon.kick.dice" v-model="actor.system.attributes.weapon.kick.dice" :disabled="overrides.includes('system.attributes.weapon.kick.dice')" placeholder="d10"/>
          </div>
        </div>
      </div>
      <!-- Flag Settings -->
      <div class="unit unit--flags">
        <div v-for="(flag, f) in flags" :key="f" :data-key="f" class="settings-flags">
          <label :for="concat('flags.archmage.', f)" class="unit-subtitle flexrow">
            <input v-if="!flag.options" type="checkbox" :name="concat('flags.archmage.', f, )" v-model="flag.value"> {{flag.name}}
          </label>
          <select v-if="flag.options" :name="concat('flags.archmage.', f, )" v-model="flag.value">
            <option v-for="(option, o) in flag.options" :key="o" :value="o">{{localize(option)}}</option>
          </select>
          <p class="notes">{{flag.hint}}</p>
        </div>
      </div>
      <!-- Background Settings -->
      <div class="unit unit--backgrounds">
        <div v-for="(background, b) in actor.system.backgrounds" :key="b" class="settings-background" :data-key="b">
          <input type="checkbox" :name="concat('system.backgrounds.', b, '.isActive.value')" v-model="background.isActive.value">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTERSETTINGS.', b))}}</strong>
        </div>
      </div>
      <!-- Icon Settings -->
      <div class="unit unit--icons">
        <div v-for="(icon, i) in actor.system.icons" :key="i" class="settings-icon" :data-key="i">
          <input type="checkbox" :name="concat('system.icons.', i, '.isActive.value')" v-model="icon.isActive.value">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTERSETTINGS.', i))}}</strong>
        </div>
      </div>
      <!-- Resource Settings -->
      <div class="unit unit--resources">
        <!-- Custom -->
        <div v-for="(resource, r) in resourcesCustom" :key="r" class="settings-resource" :data-key="r">
          <input type="checkbox" :name="concat('system.resources.spendable.', r, '.enabled')" v-model="resource.enabled">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTER.RESOURCES.', r))}}</strong>
          <br/>
          {{localize(concat('ARCHMAGE.RESTS.header'))}}:&nbsp;
          <select :name="concat('system.resources.spendable.', r, '.rest')" v-model="resource.rest">
            <option v-for="(option, index) in resourceRestTypes" :key="index" :value="option.value">
            {{localize(concat('ARCHMAGE.RESTS.',option.value))}}</option>
          </select>
        </div>
        <!-- Momentum, Command Points and Focus -->
        <div v-for="(resource, r) in resourcesPerCombat" :key="r" class="settings-resource" :data-key="r">
          <input type="checkbox" :name="concat('system.resources.perCombat.', r, '.enabled')" v-model="resource.enabled">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTER.RESOURCES.', r))}}</strong>
        </div>
        <!-- Ki -->
        <div v-for="(resource, r) in resourcesSpendable" :key="r" class="settings-resource" :data-key="r">
          <input type="checkbox" :name="concat('system.resources.spendable.', r, '.enabled')" v-model="resource.enabled">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTER.RESOURCES.', r))}}</strong>
        </div>
      </div>

      <div class="flexcol unit unit--hooks" style="grid-column-end: span 6">
        <h3>
          {{localize('ARCHMAGE.SETTINGS.lifecycleHooks.title')}}
          <InfoBubble :tooltip="localize('ARCHMAGE.SETTINGS.lifecycleHooks.hint')"/>
        </h3>
        <div class="flexrow form-group stacked">
          <div class="flexcol field">
            <label style="flex-grow: 0;">{{localize('ARCHMAGE.SETTINGS.lifecycleHooks.startOfTurn')}}</label>
            <CodemirrorWrapper class="attribute-value"
              name="system.lifecycleHooks.startOfTurn"
              :value="actor.system.lifecycleHooks.startOfTurn"
              :disable-paste-parsing="true" />
          </div>
          <div class="flexcol field">
            <label style="flex-grow: 0;">{{localize('ARCHMAGE.SETTINGS.lifecycleHooks.endOfTurn')}}</label>
            <CodemirrorWrapper class="attribute-value"
              name="system.lifecycleHooks.endOfTurn"
              :value="actor.system.lifecycleHooks.endOfTurn"
              :disable-paste-parsing="true" />
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script>
import { concat, localize } from '@/methods/Helpers';
import { CodemirrorWrapper, InfoBubble } from '@/components';

export default {
  name: 'CharSettings',
  props: ['actor', 'owner', 'tab'],
  components: { CodemirrorWrapper, InfoBubble },
  setup() {
    return {
      concat,
      localize
    }
  },
  data() {
    return {
      resourceRestTypes: [
        { value: 'none', label: 'Do nothing' },
        { value: 'quickreset', label: 'Clear on Quick Rest' },
        { value: 'fullreset', label: 'Clear on Full Heal-Up' },
        { value: 'quick', label: 'Refill on Quick Rest' },
        { value: 'full', label: 'Refill on Full Heal-Up' },
      ],
      abilities: [
        { value: 'str', label: "Str"},
        { value: 'con', label: "Con"},
        { value: 'dex', label: "Dex"},
        { value: 'int', label: "Int"},
        { value: 'wis', label: "Wis"},
        { value: 'cha', label: "Cha"},
      ]
    }
  },
  computed: {
    flags() {
      let flags = CONFIG.Actor.characterFlags;
      let charFlags = this.actor.flags && this.actor.flags.archmage ? this.actor.flags.archmage : {};
      for (let [k, v] of Object.entries(flags)) {
        v.value = charFlags && charFlags[k] ? charFlags[k] : null;
        flags[k] = v;
      }
      return flags;
    },
    classes() {
      return `section section--settings flexcol`;
    },
    resourcesCustom() {
      let resources = {};
      for (let [k,v] of Object.entries(this.actor.system.resources.spendable)) {
        if ( v.secondEdition && !game.settings.get('archmage', 'secondEdition') ) continue;
        if (k.includes('custom')) resources[k] = v;
      }
      return resources;
    },
    resourcesPerCombat() {
      let resources = {};
      for (let [k,v] of Object.entries(this.actor.system.resources.perCombat)) {
        if ( v.secondEdition && !game.settings.get('archmage', 'secondEdition') ) continue;
        resources[k] = v;
      }
      return resources;
    },
    resourcesSpendable() {
      let resources = {};
      for (let [k,v] of Object.entries(this.actor.system.resources.spendable)) {
        if ( v.secondEdition && !game.settings.get('archmage', 'secondEdition') ) continue;
        if (!k.includes('custom')) resources[k] = v;
      }
      return resources;
    },
    overrides() {
      return Object.keys(this.actor.overrides);
    }
  },
  methods: { /* See created. */},
  async mounted() {}
}
</script>
