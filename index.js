const FernSDK = window.FernSDK = {
  package: {
    name: 'fern-sdk',
    version: '0.0.6'
  },
  Frond: ({
    rootElement,
    notificationElement,
    onClickCard,
    onSaveCard
  }) => {
    const renderCardList = async ({ cards, parentElement }) => {
      const cardList = document.createElement('ul');

      cardList.setAttribute('class', 'card-list');

      if (!cards) {
        notification.innerHTML = 'No wallet found.';
        notificationElement.setAttribute('class', 'show error');
        setTimeout(() => notificationElement.removeAttribute('class'), 5000);

        return;
      }

      cardList.innerHTML = cards.map(card => {
        if (!card?.processor) return;

        const {
          name,
          number,
          processor
        } = card;

        return `
          <li class="card ${processor.toLowerCase()}" data-id="${number}">
            <p class="number">${number}</p>
            <span class="details">
              <p>${name}</p>
              <!-- <img src="${processor.toLowerCase()}" alt="${processor}" width="72" height="36" /> -->
            </span>
          </li>
        `;
      })
      .join('');

      cardList.innerHTML += (`
        <li class="card new">
          <button id="add-card">
            + Add Card
          </button>
        </li>
      `);

      if (parentElement) {
        parentElement.innerHTML = `
          <h3>Payment Method</h3>
          ${cardList.outerHTML}
        `;
      }

      requestAnimationFrame(
        bindCardListEvents.bind(this, { cards })
      );

      return true;
    };

    const bindCardListEvents = ({ cards }) => {
      const addCardButton = document.getElementById('add-card');
      const saveCardButton = document.getElementById('save-card');

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

      const onClickAddCard = () => {
        overlay.setAttribute('class', 'show');

        requestAnimationFrame(() => {
          rootElement.onclick = onClickOutsideOverlay;
          saveCardButton.onclick = onClickSaveCard;
        });
      };

      addCardButton.onclick = onClickAddCard;

      const walletOverlay = document.querySelector('.frond-wallet-overlay');

      walletOverlay.onclick = event => {
        if (
          event.target.localName === 'body' ||
          event.target.className === 'frond-wallet-overlay'
        ) {
          walletOverlay.remove();
        }
      };

      [].forEach.call(
        document.querySelectorAll('.card-list > .card:not(.new)'),
        element => onClickCard(element)
      );
    };

    const onShow = ({ cards }) => {
      const frondWalletOverlay = document.createElement('div');
      const frondWalletOverlayStyles = document.createElement('style');

      frondWalletOverlay.setAttribute('class', 'frond-wallet-overlay');
      frondWalletOverlayStyles.setAttribute('scoped', true);

      frondWalletOverlayStyles.innerHTML = `
        .frond-wallet-overlay {
          position: fixed;
          background: rgba(0, 0, 0, .8);
          left: 220px;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          z-index: 800;
        }
        .frond-wallet {
          display: flex;
          flex-direction: column;
          background: #111;
          color: white;
          box-shadow: 0 0 1rem black;
          border-radius: 0.5rem;
          border: 1px solid black;
          padding: 1rem;
          margin: 2rem;
          overflow: auto;
        }
        .frond-wallet > h3 {
          color: white;
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
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          width: 19rem;
          height: 12rem;
          background: linear-gradient(to bottom, #00ffff, #2196f3);
          margin: 1rem;
          padding: 2rem;
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
        .card.new {
          display: block;
          background: transparent;
          border: 1px dashed white;
          line-height: 12rem;
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

      frondWalletOverlay.innerHTML = `
        <div class="frond-wallet">
          <h3>Payment Method</h3>
        </div>
      `;

      rootElement.insertBefore(frondWalletOverlayStyles, rootElement.firstElementChild);
      rootElement.insertBefore(frondWalletOverlay, frondWalletOverlayStyles.nextElementSibling);

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

    return {
      onShow
    }
  },
  Payments: () => {}
};
