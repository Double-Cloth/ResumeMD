(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OVERFLOW_TOLERANCE = 1;

  function isElement(node) {
    return node && node.nodeType === 1;
  }

  function isPageOverflowing(page) {
    return page.scrollHeight > page.clientHeight + OVERFLOW_TOLERANCE;
  }

  function hasBodyContent(page) {
    const body = page.querySelector('.resume-body');
    return Boolean(body && body.children.length);
  }

  function hasPageContent(page) {
    return Boolean(page.querySelector('.resume-header') || hasBodyContent(page));
  }

  function createPage(ownerDocument) {
    const page = ownerDocument.createElement('article');
    page.className = 'resume-paper';
    return page;
  }

  function ensureBody(page, ownerDocument) {
    let body = page.querySelector('.resume-body');
    if (!body) {
      body = ownerDocument.createElement('main');
      body.className = 'resume-body';
      page.appendChild(body);
    }
    return body;
  }

  function removeIfEmpty(element) {
    if (element && !element.children.length && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  function paginateResume(container, resumeHTML) {
    if (!container || typeof container.innerHTML !== 'string') {
      return [];
    }

    const ownerDocument = container.ownerDocument || document;
    const source = ownerDocument.createElement('div');
    source.innerHTML = String(resumeHTML == null ? '' : resumeHTML);

    const header = source.querySelector('.resume-header');
    const sourceBody = source.querySelector('.resume-body');
    const topLevelBodyChildren = sourceBody
      ? Array.from(sourceBody.children).filter(isElement)
      : Array.from(source.children).filter(isElement);

    container.innerHTML = '';
    container.classList.add('resume-document');

    const pages = [];
    let currentPage = null;
    let currentBody = null;

    function addPage() {
      currentPage = createPage(ownerDocument);
      pages.push(currentPage);
      container.appendChild(currentPage);
      currentBody = null;
      return currentPage;
    }

    function addBodyPage() {
      addPage();
      currentBody = ensureBody(currentPage, ownerDocument);
      return currentBody;
    }

    function getBody() {
      if (!currentPage) {
        addPage();
      }
      currentBody = ensureBody(currentPage, ownerDocument);
      return currentBody;
    }

    function moveNodeToNewBody(node) {
      if (!hasPageContent(currentPage)) {
        return getBody();
      }
      return addBodyPage();
    }

    function appendBlock(parent, node, reopenParent) {
      parent.appendChild(node);

      if (!isPageOverflowing(currentPage)) {
        return parent;
      }

      node.parentNode.removeChild(node);
      removeIfEmpty(parent);

      const nextParent = reopenParent ? reopenParent() : moveNodeToNewBody(node);
      nextParent.appendChild(node);

      if (isPageOverflowing(currentPage)) {
        node.classList.add('resume-overflow-block');
      }

      return nextParent;
    }

    function appendList(parent, list, reopenParent) {
      const tag = list.tagName.toLowerCase();
      let activeList = ownerDocument.createElement(tag);
      parent.appendChild(activeList);

      Array.from(list.children).filter(isElement).forEach(function (item) {
        const clone = item.cloneNode(true);
        activeList.appendChild(clone);

        if (!isPageOverflowing(currentPage)) {
          return;
        }

        clone.parentNode.removeChild(clone);
        if (!activeList.children.length) {
          activeList.parentNode.removeChild(activeList);
        }

        parent = reopenParent ? reopenParent() : moveNodeToNewBody(clone);
        activeList = ownerDocument.createElement(tag);
        parent.appendChild(activeList);
        activeList.appendChild(clone);

        if (isPageOverflowing(currentPage)) {
          clone.classList.add('resume-overflow-block');
        }
      });

      removeIfEmpty(activeList);
      return parent;
    }

    function appendSection(section) {
      const sectionClass = section.className || 'resume-section';
      const elements = Array.from(section.children).filter(isElement);
      const heading = elements.length && elements[0].tagName === 'H2' ? elements[0] : null;
      const content = heading ? elements.slice(1) : elements;
      let sectionStarted = false;
      let headingPlaced = false;
      let activeSection = null;

      function openSection(includeHeading) {
        const body = getBody();
        activeSection = ownerDocument.createElement('section');
        activeSection.className = sectionClass + (includeHeading ? '' : ' resume-section-continuation');
        body.appendChild(activeSection);

        if (includeHeading && heading) {
          activeSection.appendChild(heading.cloneNode(true));
          headingPlaced = true;
        }

        sectionStarted = true;
        return activeSection;
      }

      function reopenContinuation() {
        addBodyPage();
        activeSection = ownerDocument.createElement('section');
        activeSection.className = sectionClass + ' resume-section-continuation';
        currentBody.appendChild(activeSection);
        return activeSection;
      }

      if (!content.length) {
        const target = openSection(Boolean(heading));
        if (isPageOverflowing(currentPage) && hasBodyContent(currentPage)) {
          target.parentNode.removeChild(target);
          addBodyPage();
          openSection(Boolean(heading));
        }
        return;
      }

      content.forEach(function (child) {
        if (!sectionStarted) {
          openSection(Boolean(heading && !headingPlaced));
        }

        const target = activeSection || openSection(false);

        if (/^(UL|OL)$/.test(child.tagName)) {
          activeSection = appendList(target, child, reopenContinuation);
          return;
        }

        const clone = child.cloneNode(true);
        target.appendChild(clone);

        if (!isPageOverflowing(currentPage)) {
          return;
        }

        clone.parentNode.removeChild(clone);

        const onlyHeading = target.children.length === 1 && target.firstElementChild && target.firstElementChild.tagName === 'H2';
        if (onlyHeading) {
          target.parentNode.removeChild(target);
          headingPlaced = false;
          addBodyPage();
          activeSection = openSection(Boolean(heading && !headingPlaced));
        } else {
          removeIfEmpty(target);
          activeSection = reopenContinuation();
        }

        activeSection.appendChild(clone);
        if (isPageOverflowing(currentPage)) {
          clone.classList.add('resume-overflow-block');
        }
      });
    }

    addPage();

    if (header) {
      currentPage.appendChild(header.cloneNode(true));
    }

    topLevelBodyChildren.forEach(function (child) {
      if (child.classList && child.classList.contains('resume-section')) {
        appendSection(child);
        return;
      }

      const body = getBody();
      if (/^(UL|OL)$/.test(child.tagName)) {
        appendList(body, child, function () {
          return addBodyPage();
        });
        return;
      }

      appendBlock(body, child.cloneNode(true), function () {
        return addBodyPage();
      });
    });

    if (!pages.length || !hasPageContent(pages[0])) {
      const emptyPage = pages[0] || addPage();
      emptyPage.innerHTML = '<main class="resume-body"></main>';
    }

    return pages;
  }

  return {
    paginateResume: paginateResume,
  };
});
