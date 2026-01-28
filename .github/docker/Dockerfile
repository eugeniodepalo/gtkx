FROM fedora:43

RUN echo "keepcache=1" >> /etc/dnf/dnf.conf

RUN dnf install -y \
    gcc \
    gcc-c++ \
    make \
    pkg-config \
    gtk4-devel \
    gobject-introspection-devel \
    gtksourceview5-devel \
    libadwaita-devel \
    webkitgtk6.0-devel \
    vte291-gtk4-devel \
    gstreamer1-devel \
    gstreamer1-plugins-base-devel \
    gtk4-layer-shell-devel \
    libsoup3-devel \
    json-glib-devel \
    libxml2-devel \
    libsecret-devel \
    at-spi2-core-devel \
    appstream-devel \
    mesa-libGLES \
    xorg-x11-server-Xvfb \
    git \
    && dnf clean all \
    && rm -rf /var/cache/dnf/*

RUN curl -fsSL https://rpm.nodesource.com/setup_24.x | bash - \
    && dnf install -y nodejs \
    && dnf clean all

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV PATH="/usr/local/cargo/bin:${PATH}"

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --component clippy --default-toolchain stable \
    && chmod -R a+rwX $RUSTUP_HOME $CARGO_HOME

ENV RUSTUP_TOOLCHAIN=stable
ENV CARGO_INCREMENTAL=0
ENV CARGO_NET_RETRY=10
ENV RUSTUP_MAX_RETRIES=10

LABEL org.opencontainers.image.source="https://github.com/gtkx-org/gtkx"
LABEL org.opencontainers.image.description="GTKX CI Base Image with GTK4, Node.js, Rust, and testing dependencies"
