colorSchemeGenerator = {

    init() {
        this.api = 'https://www.thecolorapi.com/scheme'

        this.colorPickerEl = document.querySelector('#color-seed')
        this.colorPickerContainerEl = document.querySelector('#color-seed-container')
        this.colorSchemeEl = document.querySelector('#color-scheme')
        this.saveButtonEl = document.querySelector('#save-color-scheme')
        this.colorsEl = document.querySelector('#colors')
        this.savedSchemesEl = document.querySelector('#saved-color-schemes')
        this.clearSavedSchemesButtonEl = document.querySelector('#clear-saved-schemes')

        this.scheme = this.getInitialScheme()
        this.savedSchemes = this.getSavedSchemes()

        this.bindEvents()
        this.updateControls()
        this.renderScheme()
        this.renderSavedSchemeButtons()
    },

    getInitialScheme() {
        const params = new URLSearchParams(window.location.search)
        const color = params.has('color')  ? params.get('color')  : this.getRandomColor()
        const mode = params.has('mode') ? params.get('mode') : this.getRandomMode()

        return { color, mode }
    },

    bindEvents() {
        const { saveButtonEl, colorPickerEl, colorSchemeEl, clearSavedSchemesButtonEl } = this
        colorSchemeEl.addEventListener('change', this.renderScheme.bind(this))
        colorPickerEl.addEventListener('input',  this.renderScheme.bind(this))
        colorPickerEl.addEventListener('input', this.renderColorPicker.bind(this))
        saveButtonEl.addEventListener('click', this.saveButtonClickHandler.bind(this))
        clearSavedSchemesButtonEl.addEventListener('click', this.clearSavedSchemes.bind(this))
    },

    updateControls() {
        const { colorPickerEl, colorSchemeEl, scheme } = this
        const { color, mode } = scheme

        colorPickerEl.value = `#${color}`
        colorSchemeEl.value = mode
        this.renderColorPicker()
    },

    renderColorPicker() {
        const colorCodeEl = this.colorPickerContainerEl.querySelector('.color-code')
        const color = this.colorPickerEl.value
        this.colorPickerContainerEl.style.backgroundColor = color
        colorCodeEl.textContent = color
        this.setContrastingColor(colorCodeEl, color.slice(1))
    },

    renderScheme(e, scheme) {
        const { colorPickerEl, colorSchemeEl } = this
        this.scheme = (scheme) ? scheme : {
            color: colorPickerEl.value.slice(1),
            mode: colorSchemeEl.value
        }
        this.getColors()
        this.renderSaveButton()
        this.updateQueryString()
    },

    getColors() {
        fetch(this.getQueryURL())
        .then(response => response.json())
        .then(data => this.renderColors(data.colors))
        .catch(error => console.error(error))
    },

    setContrastingColor(el, color) {
        fetch(`https://www.thecolorapi.com/id?format=json&hex=${color}`)
        .then(response => response.json())
        .then(data => {
            const color = data.contrast.value
            el.style.color = color
        })
        .catch(error => console.error(error))
    },

    renderColors(colors) {
        const { colorsEl, scheme } = this

        scheme.additionalColors = colors.map(color => color.hex.value)

        colorsEl.innerHTML = colors.map(color => `
        <div class="color-container" title="Copy to clipboard">
            <div class="color" style="background-color: ${color.hex.value}"></div>
            <div class="color-code">${color.hex.value}</div>
        </div>
        `).join('')
        this.bindColorEvents()
    },

    bindColorEvents() {
        const colorContainers = this.colorsEl.querySelectorAll('.color-container')
        colorContainers.forEach(colorContainer => {
            colorContainer.addEventListener('click', this.copyColor.bind(this))
        })
    },
    
    copyColor() {
        const color = event.target.closest('.color-container').querySelector('.color-code').innerText
        navigator.clipboard.writeText(color)
    },

    getQueryURL() {
        const { api, scheme } = this
        return `${api}?hex=${scheme.color}&mode=${scheme.mode}&count=5`
    },

    getRandomColor() {
        return Math.floor(Math.random()*16777215).toString(16)
    },

    getRandomMode() {
        const { colorSchemeEl } = this
        let index = Math.floor(Math.random()*colorSchemeEl.options.length)
        return colorSchemeEl.options[index].value || 'monochrome'
    },

    updateQueryString() {
        const { protocol, host, pathname } = window.location
        const { color, mode } = this.scheme
        const url = protocol + "//" + host + pathname + `?color=${color}&mode=${mode}`
        window.history.pushState({path:url}, '', url)
    },

    // Saved Schemes Logic

    saveButtonClickHandler(e) {
        e.preventDefault()
        const savedSchemeIndex = this.getSavedSchemeIndex()
        if (savedSchemeIndex > -1) this.deleteScheme(savedSchemeIndex)
        else this.saveScheme()
        this.renderSaveButton()
        this.renderSavedSchemeButtons()
    },

    renderSaveButton() {
        const { saveButtonEl } = this
        const collecting = (this.getSavedSchemeIndex() > -1) ? 1 : 0
        if (collecting) {
            saveButtonEl.innerHTML = `<i class="fi fi-sr-bookmark"></i>`
            saveButtonEl.setAttribute('title', 'Clear')
        } else {
            saveButtonEl.setAttribute('title', 'Collect')
            saveButtonEl.innerHTML = `<i class="fi fi-rr-bookmark"></i>`
        }
    },

    saveScheme() {
        const { scheme, savedSchemes } = this
        savedSchemes.push(scheme)
        localStorage.setItem('savedSchemes', JSON.stringify(savedSchemes))
    },
    
    deleteScheme(savedSchemeIndex) {
        const { savedSchemes } = this
        this.savedSchemes = [ ...savedSchemes.slice(0,savedSchemeIndex) , ...savedSchemes.slice(savedSchemeIndex + 1) ]
        localStorage.setItem('savedSchemes', JSON.stringify(savedSchemes))
        this.renderSaveButton()
        this.renderSavedSchemeButtons()
    },
    
    getSavedSchemes() {
        const savedSchemes = localStorage.getItem('savedSchemes')
        return savedSchemes ? JSON.parse(savedSchemes) : []
    },
    
    clearSavedSchemes() {
        if (window.confirm('Are you sure you want to clear all saved schemes?')) {
            this.savedSchemes = []
            localStorage.setItem('savedSchemes', JSON.stringify(this.savedSchemes))
            this.renderSaveButton()
            this.renderSavedSchemeButtons()
        }
    },

    renderSavedSchemeButtons() {
        const { savedSchemesEl, savedSchemes } = this
        savedSchemesEl.innerHTML = savedSchemes.map(scheme => `
        <span data-color="${scheme.color}" data-mode="${scheme.mode}" class="saved-scheme" title="#${scheme.color} | ${scheme.mode}">
            ${this.getSavedSchemeColorsHTML(scheme.additionalColors)}
        </span>
        `).join('')
        this.bindSavedSchemeEvents()
    },

    getSavedSchemeColorsHTML(colors) {
        return colors.map(color => `
        <div class="saved-scheme-color" style="background-color: ${color}"></div>
        `).join('')
    },

    bindSavedSchemeEvents() {
        const { savedSchemesEl } = this
        const savedSchemes = savedSchemesEl.querySelectorAll('.saved-scheme')
        savedSchemes.forEach(savedScheme => {
            savedScheme.addEventListener('click', function() {
                const scheme = {
                    color: this.getAttribute('data-color'),
                    mode: this.getAttribute('data-mode')
                }
                colorSchemeGenerator.renderScheme(null, scheme)
            })
        })
    },

    getSavedSchemeIndex() {
        const { scheme, savedSchemes } = this
        for (let i = 0; i < savedSchemes.length; i++) {
            if (savedSchemes[i].color === scheme.color && savedSchemes[i].mode === scheme.mode) {
                return i
            }
        }
        return -1
    }

}

document.addEventListener('DOMContentLoaded', function() { colorSchemeGenerator.init() })