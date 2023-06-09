import axios from 'axios'
import log from 'loglevel'

export class ScanMetrics {

  constructor(version) {
    this.version = version
    this.reset()
  }

  reset() {
    this.metricsPerFrame = []
    this.startTime = performance.now()
  }

  stash() {
    const frameMetrics = performance.getEntriesByType('measure')
    this.metricsPerFrame.push(frameMetrics)
  }

  _sendCustomAnalyticsEvent(outcome, parameters) {
    if (outcome === 'completed') {
      gtag('event', 'outcome_completed', parameters)
    }
    if (outcome === 'cancelled') {
      gtag('event', 'outcome_cancelled', parameters)
    }
  }

  async save(outcome, imageDataURL, solution) {
    try {
      const version = this.version
      const duration = performance.now() - this.startTime
      const timestamp = new Date().getTime()
      const frameCount = this.metricsPerFrame.length
      const fps = frameCount / (duration / 1000)
      const data = {
        version,
        timestamp,
        outcome,
        duration,
        frameCount,
        fps,
        metricsPerFrame: this.metricsPerFrame.slice(-100),
        imageDataURL,
        solution
      }
      await axios.post('/api/scanMetrics', data)
      this._sendCustomAnalyticsEvent(
        outcome,
        {
          version,
          timestamp,
          duration,
          frameCount,
          fps
        }
      )
    } catch (error) {
      log.error(`[ScanMetrics#save] ${error.message}`)
    }
  }
}
