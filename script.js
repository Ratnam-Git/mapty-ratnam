'use strict';

// prettier-ignore



class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, dist, duration) {
        this.coords = coords;//[lat,lng]
        this.dist = dist; //in km
        this.duration = duration; //in mins
    }

    _setDesciption() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

}

class Running extends Workout {
    type = 'running';

    constructor(coords, dist, duration, cadence) {
        super(coords, dist, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDesciption()
    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.dist;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, dist, duration, elevationGain) {
        super(coords, dist, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDesciption() //constructor method will give access to the type
    }

    calcSpeed() {
        //km/hr
        this.speed = this.dist / (this.duration * 60);
        return this.speed;
    }
}


// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);

// console.log(run1, cycle1);


///////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');




class App {

    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        //these functions will get automatically called once an object is created

        this._getPositions();


        //get data from local storage
        this._getLocalStorage();

        form.addEventListener('submit', this._newWorkout.bind(this)); //this of callback function of event handler points to the element itself hence we need to bind this to current object

        //selection between running/cycling
        //whenever there is a change in value of select element it triggers an event
        inputType.addEventListener('change', this._toggleElevationField);


        //eventListener to workout(move marker)

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    }

    _getPositions() {
        //getting coordinates


        //---using geolocation API---

        //2 callback fn - 1 will be called on success and the 2nd is the error callback


        if (navigator.geolocation) {
            // console.log(this);
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () { //as getCurrentPosition treats the callback function as a normal function, we need to bind this to current object
                alert('Could not derive Coordinates')
            }
            );
        }
    }

    _loadMap(position) {

        // console.log(position);//GeolocationPosition {coords: GeolocationCoordinates, timestamp: 1703995717885}
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        // console.log(longitude, latitude);
        // console.log(`https://www.google.com/maps/@${latitude},${longitude}`); //using in gMaps

        const coords = [latitude, longitude];

        //displaying map
        // console.log(this);
        //const map can be used to implement eventListeners
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);//13 is zoom value
        //'map' must be the ID name of the element in HTMl and it is in that element where the map will be displayed

        // console.log(map);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);



        //displaying mark/form on map wherever it is clicked
        //on() method on leaflet library(alternate of eventListener)
        //handling clicks on map
        this.#map.on('click', this._showForm.bind(this)) //it acts like an eventHandler, hence we need to bind this

        //show markers initially, only when the map has been loaded
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })

    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }


    _hideMapForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }


    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {

        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input)); //every method will only return true if true for all of them

        const allPositive = (...inputs) => inputs.every(input => input > 0);

        e.preventDefault();


        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;


        //if workout is running, create running object else create cycling object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //check if data is valid
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert('Inputs have to be positive numbers!');

            //create running object
            workout = new Running([lat, lng], distance, duration, cadence);


        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            // if (!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)) 
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert('Inputs have to be positive numbers!');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        //Add new object to the workout array

        this.#workouts.push(workout);
        // console.log(workout);


        //render workout on map as marker

        //Display marker
        // console.log(mapEvent);

        this._renderWorkoutMarker(workout)

        //render workout on the list
        this._renderWorkout(workout);


        //Hide form and clear input fields
        this._hideMapForm();


        //Set local storage to all workouts
        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map) //since we are manually calling the fn, no need to bind 'this'
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.dist}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

        if (workout.type === 'running') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>`;
        }

        if (workout.type === 'cycling') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`;
        }

        form.insertAdjacentHTML('afterend', html);

    }


    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        // console.log(workoutEl);

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        // console.log(workout);

        //move the market to coordinates attained from workout
        //build in method in leaflet - setView(arg1 = coordinates, arg2 = zoom level, arg3 = object of options)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
    }


    _setLocalStorage() {

        //using localStorage API(arg1 = key, arg2 = string)
        //convert object to string - JSON.stringify()
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    }


    _getLocalStorage() {

        //IMP -> converting object to string will make us loost the prototype chain

        const data = JSON.parse(localStorage.getItem('workouts')); //convert string to object
        // console.log(data);

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        })
    }


    reset() {
        //delete localStorage

        localStorage.removeItem('workouts');

        //enables us to programmatically reload the page and empty the localStorage
        location.reload();
    }

}


const app = new App();






