(function () {
  'use strict';

  const hit = new Image();
  const miss = new Image();
  const cross = new Image();
  const clickSound = new Audio('./sounds/click.wav');
  const messageSound = new Audio('./sounds/message.mp3');
  const missSound = new Audio('./sounds/miss.mp3');
  const hitSound = new Audio('./sounds/hit.mp3');

  hit.src = './img/hit.png';
  miss.src = './img/miss.png';
  cross.src = './img/cross.png';

  const startButton = document.getElementById('start-button');
  const fireButton = document.getElementById('fire-button');
  const inputField = document.getElementById('input-field');
  const messageBar = document.getElementById('message-bar');
  const shipStats = {
    1: document.getElementById('1x-ships'),
    2: document.getElementById('2x-ships'),
    3: document.getElementById('3x-ships'),
    4: document.getElementById('4x-ships'),
  };
  const cvs = document.getElementById('canvas');
  const ctx = cvs.getContext('2d');

  let timerId;
  const clearInput = () => (inputField.value = '');
  const hideMessage = () => (messageBar.style.visibility = 'hidden');
  const showMessage = (message) => {
    clearTimeout(timerId);
    messageBar.innerHTML = message;
    messageBar.style.visibility = 'visible';
    timerId = setTimeout(() => {
      messageBar.style.visibility = 'hidden';
    }, 4000);
  };

  function playSound(audio) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.currentTime = 0;
    }
  }

  const state = {
    hits: [],
    misses: [],
    tries: 0,
    sunkedShips: [],
    get sunkedCells() {
      return state.sunkedShips.reduce(
        (acc, sunkedShip) => acc.concat(sunkedShip.locations),
        [],
      );
    },
    occupiedCells: [],
    ships: [],
  };

  const model = {
    board: {
      sideWidth: 570,
      cellsInLine: 10,
      cellSize: 57,
      deltaX: 30,
      deltaY: 36,
      shipsTypes: [
        { size: 4, amount: 2 },
        { size: 3, amount: 3 },
        { size: 2, amount: 4 },
        { size: 1, amount: 4 },
      ],
      shipsTypeAmount(typeSize) {
        return this.shipsTypes.filter((type) => type.size === typeSize)[0]
          .amount;
      },
      get shipsAmount() {
        return this.shipsTypes.reduce((acc, type) => (acc += type.amount), 0);
      },
      letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      battleField: null,
      fieldKeys: null,
    },
    checkShot(inputValue) {
      if (!inputValue) {
        showMessage('ENTER SOMETHING, CAPTAIN! 🦜');
        playSound(messageSound);
        return false;
      }
      if (!this.fieldKeys.includes(inputValue)) {
        showMessage("DON'T UNDERSTAND YOU, SIR! ENTER, FOR EXAMPLE: 'a1' 🦜");
        playSound(messageSound);
        return false;
      }
      if (
        state.hits.includes(inputValue) ||
        state.misses.includes(inputValue)
      ) {
        showMessage("YOU'VE ALREADY SHOT THERE 🦜");
        playSound(messageSound);
        return false;
      }
      return true;
    },
    fire(guess) {
      clearInput();
      if (!this.checkShot(guess)) {
        return;
      }
      for (let ship of state.ships) {
        const { locations } = ship;
        const index = locations.indexOf(guess);

        if (index != -1) {
          state.hits.push(guess);
          ship.hitsCount++;
          state.tries++;
          showMessage('HIT! CHECK THE NEAREST CELLS 🦜');
          this.render();
          playSound(hitSound);

          if (ship.hitsCount === ship.size) {
            showMessage('💥 THE SHIP HAS SUNKED!💥');
            state.sunkedShips.push(ship);
            this.render();
            shipStats[ship.size].value = `${
              Object.keys(
                state.sunkedShips.filter(
                  (sunkedShip) => sunkedShip.size === ship.size,
                ),
              ).length
            }/${model.board.shipsTypeAmount(ship.size)}`;
          }

          if (state.sunkedShips.length === model.board.shipsAmount) {
            endGame();
            return;
          }
          return;
        }
      }
      state.misses.push(guess);
      state.tries++;
      this.render();
      playSound(missSound);
    },
    draw(cellName, type) {
      const cell = this.battleField.find((c) => c.name === cellName);
      switch (type) {
        case 'hit':
          ctx.drawImage(
            hit,
            cell.pos.x + model.board.deltaX,
            cell.pos.y + model.board.deltaY,
            model.board.cellSize,
            model.board.cellSize,
          );
          break;
        case 'miss':
          ctx.drawImage(
            miss,
            cell.pos.x + model.board.deltaX,
            cell.pos.y + model.board.deltaY,
            model.board.cellSize,
            model.board.cellSize,
          );
          break;
        case 'cross':
          ctx.drawImage(
            cross,
            cell.pos.x + model.board.deltaX,
            cell.pos.y + model.board.deltaY,
            model.board.cellSize,
            model.board.cellSize,
          );
          break;
        default:
          break;
      }
    },
    render() {
      ctx.clearRect(
        model.board.deltaX,
        model.board.deltaY,
        model.board.sideWidth,
        model.board.sideWidth,
      );
      for (let hitCell of state.hits) {
        if (state.sunkedCells.includes(hitCell)) {
          this.draw(hitCell, 'hit');
          this.draw(hitCell, 'cross');
        } else {
          this.draw(hitCell, 'hit');
        }
      }
      for (let missCell of state.misses) {
        this.draw(missCell, 'miss');
      }
    },
  };

  function createField() {
    const { sideWidth, cellSize, letters } = model.board;
    const result = [];
    let x = 0;

    for (let letter of letters) {
      let number = 0;
      for (let y = 0; y < sideWidth; y += cellSize) {
        result.push({
          name: `${letter}${number}`,
          pos: { x, y },
        });
        number++;
      }
      x += cellSize;
    }
    return result;
  }

  function generateStartLocation(shipSize) {
    const { cellsInLine, cellSize } = model.board;
    let x, y;
    let direction =
      Math.floor(Math.random() * 2) === 1 ? 'horizontal' : 'vertical';

    switch (direction) {
      case 'horizontal':
        x = Math.floor(Math.random() * (cellsInLine - shipSize + 1));
        y = Math.floor(Math.random() * cellsInLine);
        break;
      case 'vertical':
        x = Math.floor(Math.random() * cellsInLine);
        y = Math.floor(Math.random() * (cellsInLine - shipSize + 1));
        break;
    }
    return {
      x: x * cellSize,
      y: y * cellSize,
      direction,
    };
  }

  function findOccupiedCoords(coords) {
    const { x, y } = coords;
    const { cellSize, sideWidth } = model.board;
    const rawOccupiedCells = [];

    for (let xFactor = -1; xFactor <= 1; xFactor++) {
      for (let yFactor = -1; yFactor <= 1; yFactor++)
        rawOccupiedCells.push({
          x: x + cellSize * xFactor,
          y: y + cellSize * yFactor,
        });
    }
    return rawOccupiedCells.filter(
      ({ x, y }) =>
        x >= 0 &&
        x <= sideWidth - cellSize &&
        y >= 0 &&
        y <= sideWidth - cellSize,
    );
  }

  function generateShipCells(shipSize) {
    const { letters, cellSize } = model.board;
    const startCell = generateStartLocation(shipSize);
    let { x, y, direction } = startCell;

    const shipCoords = [];
    for (let i = 1; i <= shipSize; i++) {
      shipCoords.push({ x, y });
      direction === 'horizontal' ? (x += cellSize) : (y += cellSize);
    }

    const occupiedCoords = shipCoords.flatMap((coord) =>
      findOccupiedCoords(coord),
    );
    const coordsToCells = (coords) =>
      coords.reduce(
        (acc, { x, y }) =>
          acc.concat([letters[x / cellSize], y / cellSize].join('')),
        [],
      );

    return [
      coordsToCells(shipCoords),
      [...new Set(coordsToCells(occupiedCoords))],
    ];
  }

  function ship(size) {
    let shipCells;
    do {
      shipCells = generateShipCells(size);
    } while (shipCells[0].some((cell) => state.occupiedCells.includes(cell)));

    state.occupiedCells = [
      ...new Set(state.occupiedCells.concat(shipCells[1])),
    ];

    return {
      hitsCount: 0,
      size,
      locations: shipCells[0],
    };
  }

  function generateShips() {
    model.board.shipsTypes.forEach((type) => {
      for (let i = 0; i < type.amount; i++) {
        state.ships.push(ship(type.size));
      }
    });
  }

  function setStartStats() {
    shipStats[1].value = `0/${model.board.shipsTypeAmount(1)}`;
    shipStats[2].value = `0/${model.board.shipsTypeAmount(2)}`;
    shipStats[3].value = `0/${model.board.shipsTypeAmount(3)}`;
    shipStats[4].value = `0/${model.board.shipsTypeAmount(4)}`;
  }

  let canvasPosition;

  window.addEventListener('resize', function () {
    canvasPosition = {
      x: cvs.offsetLeft + model.board.deltaX,
      y: cvs.offsetTop + model.board.deltaY,
    };
  });

  function onClickCell(e) {
    e.preventDefault();
    canvasPosition = {
      x: cvs.offsetLeft + model.board.deltaX,
      y: cvs.offsetTop + model.board.deltaY,
    };
    let mousePos = {
      x: e.pageX - canvasPosition.x,
      y: e.pageY - canvasPosition.y,
    };
    if (mousePos.x < 0 || mousePos.y < 0) {
      return;
    }
    const clickedCell = {
      x: mousePos.x - (mousePos.x % model.board.cellSize),
      y: mousePos.y - (mousePos.y % model.board.cellSize),
    };
    const cellName = model.battleField
      .filter(
        (cell) => cell.pos.x === clickedCell.x && cell.pos.y === clickedCell.y,
      )
      .map((cell) => cell.name)[0];
    model.fire(cellName, 'mouseClick');
  }

  function onPressEnter(event) {
    if (event.keyCode === 13) {
      hideMessage();
      model.fire(inputField.value.toUpperCase(), 'inputClick');
    }
  }

  function startGame() {
    playSound(clickSound);
    inputField.focus();
    model.battleField = createField();
    model.fieldKeys = model.battleField.map((cell) => cell.name);
    generateShips();
    setStartStats();
    startButton.disabled = true;
    startButton.classList.add('is-disabled');
    showMessage("HELLO, CAPTAIN! IT'S TIME TO SHOOT! 🦜");

    fireButton.onclick = () => {
      inputField.focus();
      hideMessage();
      model.fire(inputField.value.toUpperCase(), 'inputClick');
    };
    window.addEventListener('keyup', onPressEnter);
    cvs.addEventListener('click', onClickCell);
  }

  function endGame() {
    fireButton.disabled = true;
    fireButton.classList.add('is-disabled');
    window.removeEventListener('keyup', onPressEnter);
    cvs.removeEventListener('click', onClickCell);
    clearTimeout(timerId);
    const finalMessage = `🎉 CONGRATS, CAPTAIN! YOU'VE DONE GAME WITH ${state.tries} TRIES! 🦜`;
    messageBar.innerHTML = finalMessage;
    messageBar.style.visibility = 'visible';
  }

  startButton.onclick = startGame;
})();
