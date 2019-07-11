<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated :class="bgClassHeader" @mousedown="onMousedown">
      <q-toolbar>
        <q-btn flat dense round @click="leftDrawerOpen = !leftDrawerOpen" aria-label="Menu" icon="menu" />

        <q-toolbar-title>
          Bolt Bots
          <q-tooltip>Running on Quasar v{{ $q.version }}</q-tooltip>
        </q-toolbar-title>

        <q-btn :icon="glos.muteAudio ? 'mdi-volume-off' : 'mdi-volume-high'" flat round @click="glos.muteAudio = !glos.muteAudio">
          <q-tooltip>Toggle audio mute</q-tooltip>
        </q-btn>
        <span class="volume-slider">
          <q-slider v-model="glos.masterVolume" :min="0" :max="200" color="white" /> <!--  label :label-value="glos.masterVolume + '%'" -->
          <q-tooltip>Master volume: {{ glos.masterVolume }}%</q-tooltip>
        </span>

        <div class="toolbarStats" ref="toolbarStats" />

        <q-btn flat dense round @click="toggleRightDrawer" icon="mdi-wan" :color="game.newChatMessages ? 'pink' : (darkMode ? 'blue-grey-5' : 'blue-grey-2')" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      no-swipe-close behavior="desktop"
      :content-class="bgClassDrawer" elevated
      @mousedown.native="onMousedown"
    >
      <q-list :dark="darkMode" class="drawer-list">
        <div class="drawer-head">
          <div class="flex flex-center">
            <img class="logo" alt="Bolt Bots logo" src="~assets/boltbots-logo.svg" @click="darkMode = !darkMode">
            <q-tooltip>Click to toggle dark mode.</q-tooltip>
          </div>

          <template v-if="game.state === 'playing'">
            <q-item-label header class="text-center text-bold">Turn {{ turn }}</q-item-label>
            <q-item-label header>Players</q-item-label>
            <q-list class="q-gutter-sm" @mousedown="onMousedown">
              <PlayerListItem v-for="(player, index) in players" :player="player" :key="index" @click.native="clickPlayer(player)" />
            </q-list>
            <template v-if="alive">
              <q-item-label header>
                Hand {{ hand.length }}/{{ handSize }}
                <q-tooltip>You can hold at most {{ handSize }} cards.</q-tooltip>
              </q-item-label>
              <q-list class="q-gutter-sm" @mousedown="onMousedown">
                <q-tooltip>Drag these cards onto the slots at the bottom to program your bot.</q-tooltip>
                <draggable class="card-slots q-gutter-sm justify-center row" :list="hand" group="hand" @end="onMouseup">
                  <q-btn v-for="(card, index) in hand" :key="index" class="card" push color="primary" no-caps draggable="true" @click="useCard(card)" @dragstart="dragCard(card)" @dragend="dragCardStop" :disable="disableAct">
                    <span>{{ card.cardType.title }}</span>
                  </q-btn>
                </draggable>
              </q-list>
            </template>
            <template v-if="deadPlayers.length > 0">
              <q-item-label header>Graveyard</q-item-label>
              <q-list class="q-gutter-sm" @mousedown="onMousedown">
                <PlayerListItem v-for="(player, index) in deadPlayers" :player="player" :key="index" />
              </q-list>
            </template>
          </template>

          <template v-else-if="game.state === 'matchmaking'">
            <q-item-label header class="text-center text-bold">Matchmaking</q-item-label>
            <q-item><q-item-section><q-input dense :dark="darkMode" label="Player name" v-model="playerName" :error="!playerNameValid"/></q-item-section></q-item>
            <q-expansion-item group="matchmaking" label="Host" :dark="darkMode" v-model="hostExpanded">
              <q-item dense><q-item-section><q-input dense :dark="darkMode" label="Match name" v-model="hostMatchName" :error="!hostMatchNameValid"/></q-item-section></q-item>
              <q-item dense><q-item-section><q-input dense :dark="darkMode" label="Password" v-model="hostPassword" :error="!hostPasswordValid"/></q-item-section></q-item>
              <q-item dense>
                <q-item-section><q-input dense :dark="darkMode" label="End turn time limit" v-model.number="hostEndTurnTimeLimit" type="number" :error="!hostEndTurnTimeLimitValid" suffix="s" input-class="duration-input"/></q-item-section>
                <MatchmakingTooltip type="endTurnTimeLimit" />
              </q-item>
              <q-item dense><q-item-section><q-input dense :dark="darkMode" label="Max. players" v-model.number="hostMaxPlayers" type="number" :error="!hostMaxPlayersValid"/></q-item-section></q-item>
              <q-item dense>
                <q-item-section><q-input dense :dark="darkMode" label="Checkpoints" v-model.number="hostCheckpointCount" type="number" :error="!hostCheckpointCountValid"/></q-item-section>
                <MatchmakingTooltip type="checkpointCount" />
              </q-item>
              <q-item dense>
                <q-item-section><q-input dense :dark="darkMode" label="Hand size" v-model.number="hostHandSize" type="number" :error="!hostHandSizeValid"/></q-item-section>
                <MatchmakingTooltip type="handSize" />
              </q-item>
              <q-item dense>
                <q-item-section><q-input dense :dark="darkMode" label="Card slots" v-model.number="hostSlotCount" type="number" :error="!hostSlotCountValid"/></q-item-section>
                <MatchmakingTooltip type="slotCount" />
              </q-item>
              <q-item dense>
                <q-item-section><q-input dense :dark="darkMode" label="Seed" v-model="hostSeed" @keydown.enter="regenerateMap" /><q-tooltip>Seed for the random number generator.</q-tooltip></q-item-section>
                <q-item-section side><q-btn dense icon="mdi-dice-multiple" flat no-caps @click="randomizeSeed"><q-tooltip>Randomize the seed & regenerate the map.</q-tooltip></q-btn></q-item-section>
                <!-- <q-item-section side><q-btn dense label="Show" flat no-caps @click="regenerateMap"><q-tooltip>Regenerate the map using the seed.</q-tooltip></q-btn></!-->
              </q-item>
              <q-item><q-item-section><q-btn label="Host" flat no-caps @click="hostMatch" :disable="!canHost"><q-tooltip>Host with the given settings.</q-tooltip></q-btn></q-item-section></q-item>
            </q-expansion-item>
            <q-expansion-item group="matchmaking" label="Join" :dark="darkMode" v-model="joinExpanded">
                <q-item dense><q-item-section><q-input dense :dark="darkMode" label="Password" v-model="joinPassword" :error="!joinPasswordValid" :disable="!!game.isJoining"/></q-item-section></q-item>
                <q-item v-if="game.isJoining"><q-item-section>Joining match, please wait...</q-item-section></q-item>
                <q-item v-else-if="Object.keys(game.openMatches).length === 0"><q-item-section>Searching for matches, please wait...</q-item-section></q-item>
            </q-expansion-item>
          </template>

          <template v-else-if="game.state === 'lobby'">
            <q-item-label header class="text-center text-bold">Lobby</q-item-label>
            <q-item-label header>Match info</q-item-label>
            <q-item dense><q-item-section side>Name:</q-item-section><q-item-section>{{ game.netMatch.matchName }}</q-item-section></q-item>
            <q-item dense><q-item-section side>Max. players:</q-item-section><q-item-section>{{ game.netMatch.maxPlayers }}</q-item-section></q-item>
            <q-item dense><q-item-section side>End turn time limit:</q-item-section><q-item-section>{{ game.netMatch.endTurnTimeLimit }}s</q-item-section><MatchmakingTooltip type="endTurnTimeLimit" /></q-item>
            <q-item dense><q-item-section side>Checkpoints:</q-item-section><q-item-section>{{ game.netMatch.checkpointCount }}</q-item-section><MatchmakingTooltip type="checkpointCount" /></q-item>
            <q-item dense><q-item-section side>Hand size:</q-item-section><q-item-section>{{ game.netMatch.handSize }}</q-item-section><MatchmakingTooltip type="handSize" /></q-item>
            <q-item dense><q-item-section side>Slot count:</q-item-section><q-item-section>{{ game.netMatch.slotCount }}</q-item-section><MatchmakingTooltip type="slotCount" /></q-item>
            <q-item dense><q-item-section side>Seed:</q-item-section><q-item-section>{{ game.netMatch.seed }}</q-item-section></q-item>
            <q-item-label header>Players</q-item-label>
            <q-item v-for="(value, index) in match.players" :key="index" dense v-ripple class="pointer">
              <q-item-section side><q-icon :name="value.netKey === game.netKeyHost ? 'mdi-account-star' : 'mdi-account'" :color="value === match.playerSelf ? 'primary' : 'grey'"/></q-item-section>
              <q-item-section>{{ value.name }}</q-item-section>
              <q-item-section side v-if="game.isHost && value !== match.playerSelf"><q-btn flat icon="mdi-exit-run" @click="kick(value)"><q-tooltip>Kick player from lobby.</q-tooltip></q-btn></q-item-section>
            </q-item>
            <q-item><q-item-section><q-btn label="Leave" flat no-caps @click="leaveMatch"><q-tooltip>Leave the match.</q-tooltip></q-btn></q-item-section></q-item>
            <q-item v-if="game.isHost"><q-item-section><q-btn label="Start match" flat no-caps @click="startMatch" :disable="!canStartMatch"><q-tooltip>Start the match!</q-tooltip></q-btn></q-item-section></q-item>
          </template>

          <template v-else-if="game.state === 'reconnecting'">
            <q-item-label header class="text-center text-bold">Reconnecting</q-item-label>
            <q-item><q-item-section>Trying to reconnect to match {{ game.reconnectData ? '"' +game.reconnectData.matchName + '"' : '[Unknown name]' }}, please wait...</q-item-section></q-item>
            <q-item><q-item-section><q-btn label="Abort" flat no-caps @click="abortReconnect"><q-tooltip>Abort the reconnection attempt.<br>You won't be able to try reconnecting again once you press this.</q-tooltip></q-btn></q-item-section></q-item>
          </template>
        </div>

        <q-list v-if="joinExpanded && game.state === 'matchmaking' && !game.isJoining" class="drawer-scroll-content">
          <q-item v-for="value in Object.values(game.openMatches)" :key="value.matchUid" dense @click.native="joinMatch(value.matchUid)" v-ripple class="pointer">
            <q-item-section side>
              <q-icon :name="value.password ? 'mdi-lock' : 'mdi-lock-open'" />
              <q-tooltip>You need {{ value.password ? 'a' : 'no' }} password to join.</q-tooltip>
            </q-item-section>
            <q-item-section>
              {{ value.matchName }}
              <q-tooltip>
                Host name: {{ value.playerName }}<br>
                <!--Match-UID: {{ value.matchUid }}<br> -->
                End turn time limit: {{ value.endTurnTimeLimit }}s<br>
                Checkpoints: {{ value.checkpointCount }}<br>
                Hand size: {{ value.handSize }}<br>
                Slot count: {{ value.slotCount }}<br>
                Seed: {{ value.seed }}
              </q-tooltip>
            </q-item-section>
            <q-item-section side>
              {{ value.playerCount }}/{{ value.maxPlayers }}
              <q-tooltip>Player count / Max. players</q-tooltip>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- <q-item-label header>Essential Links</q-item-label>
        <q-item clickable tag="a" target="_blank" href="http://v1.quasar-framework.org">
          <q-item-section avatar>
            <q-icon name="school" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Docs</q-item-label>
            <q-item-label caption>v1.quasar-framework.org</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://github.com/quasarframework/">
          <q-item-section avatar>
            <q-icon name="code" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Github</q-item-label>
            <q-item-label caption>github.com/quasarframework</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="http://chat.quasar-framework.org">
          <q-item-section avatar>
            <q-icon name="chat" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Discord Chat Channel</q-item-label>
            <q-item-label caption>chat.quasar-framework.org</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://forum.quasar-framework.org">
          <q-item-section avatar>
            <q-icon name="record_voice_over" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Forum</q-item-label>
            <q-item-label caption>forum.quasar-framework.org</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://twitter.com/quasarframework">
          <q-item-section avatar>
            <q-icon name="rss_feed" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Twitter</q-item-label>
            <q-item-label caption>@quasarframework</q-item-label>
          </q-item-section>
        </q-item> -->
      </q-list>
    </q-drawer>

    <q-drawer
      v-model="rightDrawerOpen"
      no-swipe-close behavior="desktop"
      :content-class="bgClassDrawer" elevated
      @mousedown.native="onMousedown"
      side="right"
    >
      <q-list :dark="darkMode" class="drawer-list">
        <div class="drawer-head">
          <q-item-label header class="text-center text-bold">About</q-item-label>
          <q-item dense><q-item-section>
            <div class="about">
              Bolt Bots is a <a href="https://en.wikipedia.org/wiki/Free_and_open-source_software">FOSS</a>
              game with gameplay which is meant to loosely resemble that of the board game <a href="https://en.wikipedia.org/wiki/RoboRally">Robo Rally</a>.
              It is currently a rather basic prototype which may be heavily extended in the (possibly distant) future.
              You can find the MPL-2.0 licensed source code repository on <a href="https://github.com/torss/boltbots">GitHub</a>.
            </div>
          </q-item-section></q-item>

          <q-item-label header class="text-center text-bold">
            Network info
            <q-tooltip>ID: {{ game.netNodeIdStr }}</q-tooltip>
          </q-item-label>
          <template v-if="game.state === 'matchmaking'">
            <q-item dense><q-item-section>Players online: {{ game.playersOnlineCount }}</q-item-section></q-item>
            <q-item dense><q-item-section>Connected peer count: {{ game.connectedPeers.length }}</q-item-section></q-item>
            <q-item dense><q-item-section>Discovered peer count: {{ game.discoveredPeerCount }}
              <q-tooltip>This is a total over time.</q-tooltip>
            </q-item-section></q-item>
          </template>
          <template v-else>
            <q-item dense><q-item-section>Global network info is only updated during matchmaking.</q-item-section></q-item>
          </template>

          <q-item-label header class="text-center text-bold">Match chat</q-item-label>
          <q-item dense>
            <q-item-section><q-input dense :dark="darkMode" label="Chat message" v-model="chatMessage" :disable="game.state === 'matchmaking'" :error="!chatMessageValid" @keydown.enter="sendChatMessage"/></q-item-section>
            <q-tooltip>{{ game.state === 'matchmaking' ? 'Join a match to chat.' : 'Press enter to send your message.' }}</q-tooltip>
          </q-item>
        </div>
        <q-list class="drawer-scroll-content">
          <q-item dense v-for="(value, index) in chatMessages" :key="index">
            <q-item-section side>{{ value.playerName }}:</q-item-section>
            <q-item-section>{{ value.text }}</q-item-section>
          </q-item>
        </q-list>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="dialogOpen">
      <q-card :dark="darkMode" :class="classDialog">
        <q-card-section><div class="text-h6">{{ dialogTitle }}</div></q-card-section>
        <q-card-section>{{ dialogMessage }}</q-card-section>
        <q-card-actions align="center"><q-btn flat :label="dialogCloseButtonLabel" no-caps color="primary" v-close-popup><q-tooltip>Click to close the dialog</q-tooltip></q-btn></q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script>
import { openURL, debounce } from 'quasar'
import draggable from 'vuedraggable'
import PlayerListItem from '../components/PlayerListItem'
import MatchmakingTooltip from '../components/MatchmakingTooltip'
import { glos } from '../internal/Glos'

export default {
  name: 'MainLayout',
  components: {
    draggable,
    PlayerListItem,
    MatchmakingTooltip
  },
  data () {
    this.regenerateMapDebounced = debounce(() => this.regenerateMap(), 1000)
    this.recreatePlayersDebounced = debounce(() => this.recreatePlayers(), 100)
    return {
      // leftDrawerOpen: this.$q.platform.is.desktop,
      // rightDrawerOpen: false,

      bgClassDark: 'bg-blue-grey-10',
      glos,
      hostPassword: '',
      hostSeedLastGen: glos.hostSeed,
      joinPassword: '',
      chatMessage: '',
      dialogCloseButtonLabel: 'Ok',
      dialogOpen: false
    }
  },
  methods: {
    openURL,
    useCard (card) {
      for (const cardSlot of glos.cardSlots) {
        if (!cardSlot.card) {
          cardSlot.card = card
          card.removeFromHand()
          return
        }
      }
    },
    dragCard (card) {
      glos.dragged = card
    },
    dragCardStop () {
      glos.dragged = undefined
    },
    randomizeSeed () {
      // Randomize seed
      const options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
      const newSeedLength = 8 + Math.floor(Math.random() * 16)
      let newSeed = ''
      for (let i = 0; i < newSeedLength; ++i) newSeed += options[Math.floor(Math.random() * options.length)]
      this.hostSeed = newSeed

      // Regenerate map
      this.regenerateMap()
    },
    regenerateMap () {
      if (!this.canMapGen) return
      if (this.hostSeed === this.hostSeedLastGen && this.hostCheckpointCount === this.match.checkpointCount) return
      this.hostSeedLastGen = this.hostSeed

      if (!glos.game.ready) return

      glos.game.regenerateMap()
    },
    recreatePlayers () {
      if (!this.canMapGen) return
      glos.game.recreatePlayers()
    },
    hostMatch () {
      if (!this.canHost) return
      glos.game.host({
        playerName: this.playerName,
        matchName: this.hostMatchName,
        password: this.hostPassword,
        maxPlayers: Math.floor(this.hostMaxPlayers),
        seed: this.hostSeed,
        endTurnTimeLimit: this.hostEndTurnTimeLimit,
        checkpointCount: this.hostCheckpointCount,
        handSize: this.hostHandSize,
        slotCount: this.hostSlotCount
      })
    },
    joinMatch (matchUid) {
      if (!this.playerNameValid || !this.joinPasswordValid) return
      glos.game.tryJoin(matchUid, this.playerName, this.joinPassword)
    },
    leaveMatch () {
      glos.game.leave()
    },
    kick (player) {
      glos.game.kick(player)
    },
    startMatch () {
      if (!this.canStartMatch) return
      glos.game.startMatch()
    },
    abortReconnect () {
      glos.game.clearReconnectData()
    },
    sendChatMessage () {
      if (!this.chatMessageValid || this.chatMessage === '') return
      const chatMessage = this.chatMessage
      this.chatMessage = ''
      glos.game.sendChatMessage(chatMessage)
    },
    clickPlayer (player) {
      // NOTE debug only
      // glos.game.match.playerSelf = player
      // glos.adjustPlayerSelf()
    },
    toggleRightDrawer () {
      this.rightDrawerOpen = !this.rightDrawerOpen
      if (this.rightDrawerOpen) glos.game.newChatMessages = false
    },
    checkName (name, maxLength = 8) {
      return name.length > 0 && name.length <= maxLength
    },
    checkShortText (text, maxLength = 64) {
      return text.length <= maxLength
    },
    checkIntRange (value, min, max) {
      value = Math.floor(value)
      return value >= min && value <= max
    },
    onMousedown () {
      if (glos.threejsControls) glos.threejsControls.enabled = false
      document.addEventListener('mouseup', () => this.onMouseup(), { once: true, capture: true })
    },
    onMouseup () {
      if (glos.threejsControls) glos.threejsControls.enabled = true
    }
  },
  computed: {
    game () {
      return this.glos.game
    },
    match () {
      return this.game && this.glos.game.match
    },
    hand () {
      return this.glos.hand // this.match && this.match.playerSelf.hand
    },
    alive () { return this.match && this.match.playerSelf.alive },
    openTileCount () { return this.match ? this.match.openTileCount : 0 },
    chatMessages () { return this.game ? this.game.chatMessages : [] },
    players () {
      return this.match ? this.match.turnPlayers : []
    },
    deadPlayers () {
      return this.match ? this.match.deadPlayers : []
    },
    turn () {
      return this.match ? glos.game.match.turn : 1
    },
    disableAct () {
      return this.match && (this.match.turnInProgress || !!this.match.gameOver || this.match.playerSelf.endTurn || !this.alive)
    },
    handSize () {
      return glos.game.match && glos.game.match.handSize
    },
    bgClassDrawer () {
      return this.darkMode ? this.bgClassDark : 'bg-grey-2'
    },
    bgClassHeader () {
      return this.darkMode ? this.bgClassDark : 'bg-primary'
    },
    classDialog () {
      return this.bgClassDrawer
    },
    playerNameValid () { return this.checkName(this.playerName) },
    hostMatchNameValid () { return this.checkName(this.hostMatchName, 28) },
    hostPasswordValid () { return this.checkShortText(this.hostPassword) },
    joinPasswordValid () { return this.checkShortText(this.joinPassword) },
    hostSeedValid () { return this.checkShortText(this.hostSeed) },
    chatMessageValid () { return this.chatMessage.length <= 120 },
    hostEndTurnTimeLimitValid () { return this.hostEndTurnTimeLimit >= 0 },
    hostMaxPlayersValid () { return this.checkIntRange(this.hostMaxPlayers, 2, Math.min(this.openTileCount, 32)) },
    hostCheckpointCountValid () { return this.checkIntRange(this.hostCheckpointCount, 1, 5) },
    hostHandSizeValid () { return this.checkIntRange(this.hostHandSize, 1, 16) },
    hostSlotCountValid () { return this.checkIntRange(this.hostSlotCount, 1, 8) },
    canMapGen () {
      return this.hostMaxPlayersValid && this.hostCheckpointCountValid && this.hostSeedValid
    },
    canHost () {
      return this.playerNameValid && this.hostMatchNameValid && this.hostPasswordValid && this.hostMaxPlayersValid && this.hostSeedValid && this.hostEndTurnTimeLimitValid && this.hostCheckpointCountValid && this.hostHandSizeValid && this.hostSlotCountValid
    },
    canStartMatch () {
      return this.match.players.length >= 2
    },
    dialogTitle () {
      const { dialogData } = this.glos
      if (!dialogData) return ''
      const options = {
        'reconnect-refused': 'Couldn\'t reconnect',
        'join-failure': 'Couldn\'t join match'
      }
      return options[dialogData.type] || 'Dialog'
    },
    dialogMessage () {
      const { dialogData } = this.glos
      if (!dialogData) return ''
      const options = {
        'reconnect-refused': {
          'incorrect-player': 'Your internal player identifier is incorrect, you cannot reconnect.',
          'not-playing': () => {
            const options = {
              'matchmaking': 'The match does no longer exist.',
              'lobby': 'The match is back at the lobby state. That\'s weird.',
              'playing': '...for no apparent reason, this must be a bug.',
              'reconnecting': 'Apparently the host has weird network problems. This shouldn\'t happen.'
            }
            return options[dialogData.data]
          }
        },
        'join-failure': {
          'empty-password': 'You need to enter a password to join this match.',
          'rejected': () => {
            const options = {
              'wrong-password': 'The password you entered was wrong.',
              'match-closed': 'The match is no longer available.'
            }
            return options[dialogData.data]
          }
          // 'network-error': () => `Network error: ${dialogData.data}`,
          // 'protocol-error': () => `Network protocol error: ${dialogData.data}`
        }
      }
      let result = options[dialogData.type]
      result = result && result[dialogData.why]
      if (typeof result === 'function') result = result()
      return result || ''
    },
    ...['leftDrawerOpen', 'rightDrawerOpen', 'playerName', 'hostMatchName', 'hostMaxPlayers', 'hostSeed', 'darkMode', 'hostExpanded', 'joinExpanded', 'hostEndTurnTimeLimit', 'hostCheckpointCount', 'hostHandSize', 'hostSlotCount'].reduce((obj, key) => {
      obj[key] = {
        get () { return glos[key] },
        set (newValue) {
          glos[key] = newValue
          localStorage.setItem(key, newValue)
        }
      }
      return obj
    }, {})
  },
  watch: {
    'glos.muteAudio' (newValue) {
      localStorage.setItem('muteAudio', newValue)
      glos.adjustAudioVolume()
    },
    'glos.masterVolume' (newValue) {
      localStorage.setItem('masterVolume', newValue)
      glos.adjustAudioVolume()
    },
    hostSeed (newValue) {
      this.regenerateMapDebounced()
    },
    hostMaxPlayers (newValue) { this.recreatePlayersDebounced() },
    hostCheckpointCount (newValue) { this.regenerateMapDebounced() },
    'glos.dialogData' (newValue) {
      const choose = (options) => options[Math.floor(Math.random() * options.length)]
      const resolve = (options) => {
        let option = choose(options)
        while (option) {
          if (typeof option === 'function') option = option()
          else if (Array.isArray(option)) option = choose(option)
          else return option
        }
        console.warn('glos.dialogData - resolve error')
      }
      const long = () => {
        const thanks = choose(['Thank you', 'Thanks', 'My heartfelt thanks', 'Many thanks', 'A thousand thanks', 'Cordial thanks', 'Thanks a lot', 'Thanks a million', 'Thank you very much', 'Thanks a ton', 'Thanks again', 'Thx', 'TANK you'])
        const honorific = choose(['Sir', 'Lord', 'Mr.', 'Ms.'])
        const can = choose(['can', 'may', 'are allowed to', 'are permitted to'])
        const go = choose(['go', 'leave'])
        const punctuation = choose(['', '.', '!', '¡'])
        return `${thanks} ${honorific} Dialog, you ${can} ${go} now${punctuation}`
      }
      const optionsNegative = [['Damn', 'Damn it', 'Whatever', 'Whatevs', 'Fine', 'That\'s not good', 'That\'s bad'], ['Oops', '¯\\_(ツ)_/¯', 'What a pity', 'Too bad'], ['😖', '😲', '😯', '😮', '🤨', '🤔', '😱', '👎']]
      const options = [['Ok', 'OK', 'K', '👌'], ['Affirmative', 'Alright', 'Understood', 'Got it'], ...optionsNegative, long]
      this.dialogCloseButtonLabel = resolve(options) || 'Ok'
      this.dialogOpen = true
    }
  }
}
</script>

<style lang="stylus">
.duration-input
  text-align right
</style>

<style lang="stylus" scoped>
.logo
  width 50%

.toolbarStats
  float right

.volume-slider
  min-width 10em
  margin-right 1em

.pointer
  cursor pointer

.about
  color $blue-grey-6
  a
    color $blue-grey-3

.drawer-list
  display flex
  flex-flow column
  height 100%

.drawer-head
  flex 0 1 auto

.drawer-scroll-content
  display flex
  flex-flow column
  flex 1 1 auto
  overflow-y auto
</style>
