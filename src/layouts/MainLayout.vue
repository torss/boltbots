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

        <q-btn flat dense round @click="toggleRightDrawer" icon="mdi-wan" :color="game.newChatMessages ? 'primary' : (darkMode ? 'blue-grey-5' : 'blue-grey-2')" />
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
                <q-tooltip>
                  This time (in seconds) will start to run out once a player has finished his turn.<br>
                  If the other players can't end their turns within this time limit, it will end automatically.<br>
                  Set this to 0 to disable the time limit.
                </q-tooltip>
              </q-item>
              <q-item dense><q-item-section><q-input dense :dark="darkMode" label="Max. players" v-model.number="hostMaxPlayers" type="number" :error="!hostMaxPlayersValid"/></q-item-section></q-item>
              <q-item dense>
                <q-item-section><q-input dense :dark="darkMode" label="Seed" v-model="hostSeed" @keydown.enter="regenerateMap" /><q-tooltip>Seed for the random number generator.</q-tooltip></q-item-section>
                <q-item-section side><q-btn dense icon="mdi-dice-multiple" flat no-caps @click="randomizeSeed"><q-tooltip>Randomize the seed & regenerate the map.</q-tooltip></q-btn></q-item-section>
                <!-- <q-item-section side><q-btn dense label="Show" flat no-caps @click="regenerateMap"><q-tooltip>Regenerate the map using the seed.</q-tooltip></q-btn></!-->
              </q-item>
              <q-item><q-item-section><q-btn label="Host" flat no-caps @click="hostMatch" :disable="!canHost"><q-tooltip>Host with the given settings.</q-tooltip></q-btn></q-item-section></q-item>
            </q-expansion-item>
            <q-expansion-item group="matchmaking" label="Join" :dark="darkMode" v-model="joinExpanded">
                <q-item v-if="Object.keys(game.openMatches).length === 0"><q-item-section>No open games.</q-item-section></q-item>
                <q-item dense><q-item-section><q-input dense :dark="darkMode" label="Password" v-model="joinPassword" :error="!joinPasswordValid"/></q-item-section></q-item>
            </q-expansion-item>
          </template>

          <template v-else-if="game.state === 'lobby'">
            <q-item-label header class="text-center text-bold">Lobby</q-item-label>
            <q-item-label header>Match info</q-item-label>
            <q-item dense><q-item-section side>Name:</q-item-section><q-item-section>{{ game.netMatch.matchName }}</q-item-section></q-item>
            <q-item dense><q-item-section side>End turn time limit:</q-item-section><q-item-section>{{ game.netMatch.endTurnTimeLimit }}s</q-item-section></q-item>
            <q-item dense><q-item-section side>Max. players:</q-item-section><q-item-section>{{ game.netMatch.maxPlayers }}</q-item-section></q-item>
            <q-item dense><q-item-section side>Seed:</q-item-section><q-item-section>{{ game.netMatch.seed }}</q-item-section></q-item>
            <q-item-label header>Players</q-item-label>
            <q-item v-for="(value, index) in game.lobbyPeers" :key="index" dense v-ripple class="pointer">
              <q-item-section side><q-icon :name="value.isHost ? 'mdi-account-star' : 'mdi-account'" :color="value.isSelf ? 'primary' : 'grey'"/></q-item-section>
              <q-item-section>{{ value.playerName }}</q-item-section>
              <q-item-section side v-if="game.pseudoPeer.isHost && !value.isSelf"><q-btn flat icon="mdi-exit-run" @click="kick(value)"><q-tooltip>Kick player from lobby.</q-tooltip></q-btn></q-item-section>
            </q-item>
            <q-item><q-item-section><q-btn label="Leave" flat no-caps @click="leaveMatch"><q-tooltip>Leave the match.</q-tooltip></q-btn></q-item-section></q-item>
            <q-item v-if="game.pseudoPeer.isHost"><q-item-section><q-btn label="Start match" flat no-caps @click="startMatch" :disable="!canStartMatch"><q-tooltip>Start the match!</q-tooltip></q-btn></q-item-section></q-item>
          </template>
        </div>

        <q-list v-if="joinExpanded && game.state === 'matchmaking'" class="drawer-scroll-content">
          <q-item v-for="(value, key) in game.openMatches" :key="key" dense @click.native="joinMatch(key)" v-ripple class="pointer">
            <q-item-section side>
              <q-icon :name="value.password ? 'mdi-lock' : 'mdi-lock-open'" />
              <q-tooltip>You need {{ value.password ? 'a' : 'no' }} password to join.</q-tooltip>
            </q-item-section>
            <q-item-section>
              {{ value.matchName }}
              <q-tooltip>
                Host name: {{ value.playerName }}<br>
                Net-ID: {{ key }}<br>
                End turn time limit: {{ value.endTurnTimeLimit }}s<br>
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
            Network Info
            <q-tooltip>ID: {{ net.netNodeIdStr }}</q-tooltip>
          </q-item-label>
          <q-item dense><q-item-section>Players online: {{ net.onlinePlayerPeers.length + 1 }}</q-item-section></q-item>
          <q-item dense><q-item-section>Connected peer count: {{ net.connectedPeers.length }}</q-item-section></q-item>
          <q-item dense><q-item-section>Discovered peer count: {{ net.discoveredPeerCount }}
            <q-tooltip>This is a total over time.</q-tooltip>
          </q-item-section></q-item>

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

    <q-dialog v-model="glos.wrongPassword">
      <q-card :dark="darkMode" :class="classDialog">
        <q-card-section><div class="text-h6">Wrong match password</div></q-card-section>
        <q-card-section>The password you entered wasn't correct.</q-card-section>
        <q-card-actions align="center"><q-btn flat label="Ok" color="primary" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script>
import { openURL, debounce } from 'quasar'
import draggable from 'vuedraggable'
import PlayerListItem from '../components/PlayerListItem'
import { glos } from '../internal/Glos'

export default {
  name: 'MainLayout',
  components: {
    draggable,
    PlayerListItem
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
      chatMessage: ''
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
      if (this.hostSeed === this.hostSeedLastGen) return
      this.hostSeedLastGen = this.hostSeed

      if (!glos.game.ready) return

      glos.game.regenerateMap()
    },
    recreatePlayers () {
      if (!this.canMapGen) return
      glos.game.recreatePlayers(true)
    },
    hostMatch () {
      if (!this.canHost) return
      glos.game.host({
        playerName: this.playerName,
        matchName: this.hostMatchName,
        password: this.hostPassword,
        maxPlayers: Math.floor(this.hostMaxPlayers),
        seed: this.hostSeed,
        endTurnTimeLimit: this.hostEndTurnTimeLimit
      }, this.playerName)
    },
    joinMatch (hostKey) {
      if (!this.playerNameValid || !this.joinPasswordValid) return
      glos.game.tryJoin(hostKey, this.playerName, this.joinPassword)
    },
    leaveMatch () {
      glos.game.leave()
    },
    kick (peerInfo) {
      glos.game.kick(peerInfo)
    },
    startMatch () {
      if (!this.canStartMatch) return
      glos.game.startMatch()
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
    checkName (name, maxLength = 35) {
      return name.length > 0 && name.length <= maxLength
    },
    checkShortText (text, maxLength = 64) {
      return text.length <= maxLength
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
    net () {
      return this.game
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
      return glos.game.match && (glos.game.match.turnInProgress || !!glos.game.match.gameOver)
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
    hostMatchNameValid () { return this.checkName(this.hostMatchName) },
    hostPasswordValid () { return this.checkShortText(this.hostPassword) },
    joinPasswordValid () { return this.checkShortText(this.joinPassword) },
    hostSeedValid () { return this.checkShortText(this.hostSeed) },
    chatMessageValid () { return this.chatMessage.length <= 120 },
    hostEndTurnTimeLimitValid () { return this.hostEndTurnTimeLimit >= 0 },
    hostMaxPlayersValid () {
      const maxPlayers = Math.floor(this.hostMaxPlayers)
      return maxPlayers >= 2 && maxPlayers <= this.openTileCount && maxPlayers <= 32
    },
    canMapGen () {
      return this.hostMaxPlayersValid && this.hostSeedValid
    },
    canHost () {
      return this.playerNameValid && this.hostMatchNameValid && this.hostPasswordValid && this.hostMaxPlayersValid && this.hostSeedValid && this.hostEndTurnTimeLimitValid
    },
    canStartMatch () {
      return this.game.lobbyPeers.length >= 2
    },
    ...['leftDrawerOpen', 'rightDrawerOpen', 'playerName', 'hostMatchName', 'hostMaxPlayers', 'hostSeed', 'darkMode', 'hostExpanded', 'joinExpanded', 'hostEndTurnTimeLimit'].reduce((obj, key) => {
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
    hostMaxPlayers (newValue) {
      this.recreatePlayersDebounced()
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
