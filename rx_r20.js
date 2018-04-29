function Observer(doOnNext, doOnError, doOnComplete) {
  this.doOnNext = doOnNext || function () {};
  this.doOnError = doOnError || function () {};
  this.doOnComplete = doOnComplete || function () {};
}

function Subject(name) {
  this.observers = [];
  this.isStopped = false;
}

function Observable(source) {
  this.observers = [];
  this.isStopped = false;
}

Subject.prototype = {
  subscribe: function(observer) {
    this.observers.push(observer);
  },
  unsubscribe: function(observer) {
    this.observers = this.observers.filter(observer => observer !== observer);
  },
  _onNext: function (value) {
    var source = this;
    source.observers.forEach(function(observer) {
      if (observer.isStopped) {
        source.unsubscribe(observer);
      } else {
        observer.doOnNext(value);
      }
    });
  },
  onNext: function(value) {
    this._onNext(value);
  },
  _onComplete: function () {
    var source = this;
    source.observers.forEach(function(observer) {
      source.isStopped = true;
      observer.doOnComplete();
    });
  },
  onComplete: function () {
    this._onComplete();
  },
  asObservable: function () {
    var observable = new Subject();
    observable.doOnNext = value => observable.onNext(value);
    observable.doOnError = value => observable.onError(value);
    observable.doOnComplete = value => observable.onComplete(value);
    this.subscribe(observable);
    return observable;
  },
  map: function (fn) {
    var mapped = this.asObservable();
    mapped.onNext = function (value) {
      mapped._onNext(fn(value));
    };
    return mapped;
  },
  filter: function (fn) {
    var filtered = this.asObservable();
    filtered.onNext = function (value) {
      if (fn(value)) {
        filtered._onNext(value);
      }
    };
    return filtered;
  },
  take: function (amount) {
    var source = this;
    var taken = source.asObservable();
    var count = 0;
    taken.onNext = function (value) {
      count++;
      if (count <= amount) {
        this._onNext(value);
      }
      if (count === amount) {
        taken.isStopped = true;
        this._onComplete();
      }
    }
    return taken;
  },
  takeUntil: function (observable) {
    var takenUntil = this.asObservable();
    var until = new Observer(null, null, function () {
      log("SHOW ME WHAT YOU GOT");
      takenUntil._onComplete();
    })
    observable.take(1).subscribe(until);
    return takenUntil;
  }
}

var theMother = new Subject();
theMother.subscribe(new Observer(msg => log('theMother: ' + msg.content)));
var theSon = theMother.filter(msg => msg.content.length === 1).map(msg => 'theSon: ' + msg.content).take(2);
theSon.subscribe(new Observer(log));
var theBrother = theMother.map(msg => 'theBrother: ' + msg.content).takeUntil(theSon);
theBrother.subscribe(new Observer(log));

on('ready', function() {
  on('chat:message', function(msg) {
    theMother.onNext(msg);
    log('theMother: ' + _.pluck(theMother.observers, 'name'));
    log('theSon: ' + _.pluck(theSon.observers, 'name'));
    log('theBrother: ' + _.pluck(theBrother.observers, 'name'));
  })
});
