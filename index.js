const FernSDK = window.FernSDK = {
  package: {
    name: 'fern-sdk',
    version: '0.1.6'
  },
  Frond: ({
    rootElement,
    notificationElement,
    walletOnly = false,
    onClickCard,
    onPayment,
    onSaveCard,
    squareAppId,
    squareLocationId
  }) => {
    const SquareSDK = walletOnly ? false : {
      tokenize: async paymentMethod => {
        const tokenResult = await paymentMethod.tokenize();

        if (tokenResult.status === 'OK') {
          return tokenResult.token;
        } else {
          let errorMessage = `Tokenization failed-status: ${tokenResult.status}`;

          if (tokenResult.errors) {
            errorMessage += ` and errors: ${JSON.stringify(
              tokenResult.errors
            )}`;
          }

          throw new Error(errorMessage);
        }
      },

      bindCardEvents: async () => {
        if (!window.Square) {
          throw new Error('Square failed to load.');
        }

        const payments = window.Square.payments(SquareSDK.appId, SquareSDK.locationId);
        let card;

        try {
          card = await SquareSDK.initializeCard(payments);
        } catch (error) {
          console.error(error);

          return;
        }

        const handlePaymentMethodSubmission = async (event, paymentMethod) => {
          event.preventDefault();

          try {
            cardButton.disabled = true;

            const token = await SquareSDK.tokenize(paymentMethod);

            onPayment({ cardNumber: false, squareToken: token });
          } catch (error) {
            cardButton.disabled = false;

            console.error(error.message);
          }
        }

        const cardButton = document.getElementById('card-button');

        cardButton.addEventListener('click', async event => (
          handlePaymentMethodSubmission(event, card)
        ));
      },

      initializeCard: async payments => {
        const card = await payments.card();

        await card.attach('#card-container');

        return card;
      },

      initialize: () => {
        SquareSDK.appId = squareAppId;
        SquareSDK.locationId = squareLocationId;
      }
    };

    if (SquareSDK) {
      SquareSDK.initialize();
    }

    const renderCardList = async ({ cards, parentElement }) => {
      const cardList = document.createElement('ul');

      cardList.setAttribute('class', 'card-list');

      if (!cards) {
        notification.innerHTML = 'No wallet found.';
        notificationElement.setAttribute('class', 'show error');
        setTimeout(() => notificationElement.removeAttribute('class'), 5000);

        return;
      }

      cardList.innerHTML = `
        <form id="payment-form" class="flex column">
          <div id="card-container"></div>
          <h3>Saved cards</h3>
          <div id="wallet-container" class="flex start"></div>
          ${walletOnly ? '' : '<button id="card-button" type="button">Confirm</button>'}
        </form>
        <div id="payment-status-container"></div>
      `;

      requestAnimationFrame(() => {
        const walletContainer = cardList.querySelector('#wallet-container');

        walletContainer.innerHTML += cards.map(card => {
          if (!card?.processor) return;

          const {
            name,
            number,
            processor
          } = card;

          return `
            <li class="card ${processor.toLowerCase()}" data-id="${number}">
              <p class="number">${number.substr(-4)}</p>
              <span class="details">
                <p>${name}</p>
                <!-- <img src="${processor.toLowerCase()}" alt="${processor}" width="72" height="36" /> -->
              </span>
            </li>
          `;
        })
        .join('');

        if (walletOnly) {
          walletContainer.innerHTML += (`
            <li class="card new">
              <button id="add-card">
                + Add Card
              </button>
            </li>
          `);
        }

        if (parentElement) {
          parentElement.innerHTML = `
            ${walletOnly ? '' : '<h3>Card details</h3>'}
            ${cardList.outerHTML}
          `;
        }

        requestAnimationFrame(
          bindCardListEvents.bind(this, { cards })
        );
      });

      return true;
    };

    const bindCardListEvents = async ({ cards }) => {
      if (SquareSDK) {
        await SquareSDK.bindCardEvents();
      }

      const saveCardButton = document.getElementById('save-card');
      const overlay = document.querySelector('#overlay');

      const onClickCloseOverlay = () => {
        overlay.removeAttribute('class');
        saveCardButton.onclick = null;
        rootElement.onclick = null;
      };

      const onClickOutsideOverlay = event => {
        if (
          event.target.id !== 'add-card-overlay' &&
          event.target.parentElement.id !== 'add-card-overlay'
        ) {
          onClickCloseOverlay();
        }
      };

      const onClickSaveCard = async event => {
        event.preventDefault();

        const card = onSaveCard();

        if (!card || !renderCardList({
          cards: cards.concat([card]),
          parentElement: document.querySelector('.frond-wallet-overlay > .frond-wallet')
        })) {
          notificationElement.innerHTML = 'Error fetching cards.';
          notificationElement.setAttribute('class', 'show');
          setTimeout(() => notificationElement.removeAttribute('class'), 5000);
        }

        requestAnimationFrame(onClickCloseOverlay);
      };

      if (walletOnly) {
        const addCardButton = document.getElementById('add-card');

        const onClickAddCard = event => {
          event.preventDefault();
          overlay.setAttribute('class', 'show');

          requestAnimationFrame(() => {
            rootElement.onclick = onClickOutsideOverlay;
            saveCardButton.onclick = onClickSaveCard;
          });
        };

        addCardButton.onclick = onClickAddCard;
      }

      const walletOverlay = document.querySelector('.frond-wallet-overlay');

      walletOverlay.onclick = event => {
        if (
          event.target.localName === 'body' ||
          event.target.className.match('frond-wallet-overlay')
        ) {
          walletOverlay.setAttribute('class', 'frond-wallet-overlay');
        }
      };

      [].forEach.call(
        document.querySelectorAll('.card-list > .card:not(.new)'),
        element => onClickCard(element)
      );
    };

    const onShow = ({ cards }) => {
      const frondWalletOverlay = document.querySelector('.frond-wallet-overlay');

      frondWalletOverlay.setAttribute('class', 'frond-wallet-overlay show');

      if (!renderCardList({
        cards,
        parentElement: frondWalletOverlay.firstElementChild
      })) {
        notificationElement.innerHTML = 'Error fetching cards.';
        notificationElement.setAttribute('class', 'show error');
        setTimeout(() => notificationElement.removeAttribute('class'), 5000);

        return;
      }
    };

    const frondWalletOverlay = document.createElement('div');
    const frondWalletOverlayStyles = document.createElement('style');

    frondWalletOverlay.setAttribute('class', 'frond-wallet-overlay');
    frondWalletOverlayStyles.setAttribute('scoped', true);

    frondWalletOverlay.innerHTML = `
      <div class="frond-wallet">
        <h3>Payment Method</h3>
      </div>
    `;

    frondWalletOverlayStyles.innerHTML = `
      .frond-wallet-overlay {
        display: none;
        position: fixed;
        background: rgba(0, 0, 0, .5);
        left: 220px;
        right: 0;
        top: 0;
        bottom: 0;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        z-index: 800;
      }
      .frond-wallet-overlay.show {
        display: flex;
      }
      .frond-wallet {
        display: flex;
        flex-direction: column;
        background: #111;
        color: white;
        box-shadow: 0 0 5rem black;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 2rem;
        overflow: auto;
        width: 30rem;
        max-width: 75%;
      }
      .frond-wallet h3 {
        color: white;
        align-self: flex-start;
        text-align: left;
      }
      .card-list {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-start;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .card {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        width: 9rem;
        height: 6rem;
        max-width: 9rem;
        max-height: 6rem;
        background: linear-gradient(to bottom, #00ffff, #2196f3);
        margin: 1rem .5rem;
        padding: 1rem;
        border-radius: 1rem;
        overflow: hidden;
      }
      .card.drv {
        background: linear-gradient(to bottom, #111, #000);
      }
      .card:not(.new) {
        box-shadow: inset 0 1px rgb(255 255 255 / 50%), 0 2px 1rem rgb(0 10 100);
      }
      .card > .number,
      .card > .details {
        font-weight: 400;
        font-family: monospace;
        text-shadow: 0 1px #1e69b3;
      }
      .card > .number {
        flex: 1;
        align-self: flex-start;
      }
      .card > .details {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        max-height: 36px;
      }
      .card > .number p,
      .card > .details p {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      .card.new {
        display: block;
        background: transparent;
        border: 1px dashed white;
        line-height: 6rem;
        text-align: center;
        padding: 0;
        opacity: .5;
      }
      .card.new > button {
        margin: 0;
        width: 100%;
        height: 100%;
        appearance: none;
        border: none;
        background: transparent;
        color: white;
      }
      .card p {
        margin: 0;
      }
      .sq-card-wrapper .sq-card-message-no-error {
        color: white;
      }
      .sq-card-wrapper .sq-card-message-no-error::before {
        background-color: white;
      }
      #payment-form,
      #card-container,
      #wallet-container {
        width: 100%;
      }
      #overlay {
        display: none;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.75);
        align-items: center;
        justify-content: center;
        z-index: 850;
      }
      #overlay.show {
        display: flex;
      }
      #add-card-overlay {
        flex: 1;
        flex-direction: row;
        flex-wrap: wrap;
        max-width: 30rem;
        height: 19rem;
        align-items: center;
        justify-content: space-between;
        margin-left: 220px;
        padding: 1rem;
        border: 1px solid black;
        border-radius: 1rem;
        min-height: 20rem;
      }
      #add-card-overlay > input,
      #save-card {
        background: rgba(255, 255, 255, .5);
        color: #2196f3;
        border: none;
        border-radius: 0.5rem;
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 25%);
        width: 100%;
        margin: 0;
        padding: 1rem;
        font-family: monospace;
        font-size: .75em;
        font-weight: 600;
      }
      #add-card-overlay > input::placeholder {
        color: #2196f3;
      }
      #add-card-overlay > input:nth-of-type(3),
      #add-card-overlay > input:nth-of-type(4) {
        max-width: 25%;
      }
      #save-card {
        background: white;
        color: #2196f3;
        font-weight: 600;
      }
      @media (max-width: 900px) {
        .frond-wallet-overlay {
          left: 0;
        }
        .card-list {
          display: block;
        }
        .card {
          margin: 2rem auto;
        }
        #add-card-overlay {
          margin: 1rem;
        }
      }
    `;

    const overlay = document.createElement('aside');

    overlay.setAttribute('id', 'overlay');

    overlay.innerHTML = `
      <form id="add-card-overlay" class="card" action="">
        <input id="card-number" type="number" placeholder="Card number" required />
        <input id="card-name" type="text" placeholder="Name on card" required />
        <input id="card-expiration" type="number" placeholder="Exp." required />
        <input id="card-cvv" type="number" placeholder="CVV" required />
        <button id="save-card">Save</button>
      </form>
    `;

    rootElement.insertBefore(frondWalletOverlay, frondWalletOverlayStyles.nextElementSibling);
    rootElement.insertBefore(frondWalletOverlayStyles, rootElement.firstElementChild);
    rootElement.insertBefore(overlay, notification.nextElementSibling);

    return {
      onShow
    }
  },
  Payments: () => {}
};
