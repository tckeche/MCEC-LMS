{ pkgs }: {
  deps = [
    pkgs.nodejs_20

    pkgs.glib
    pkgs.libxkbcommon

    pkgs.nss
    pkgs.nspr
    pkgs.atk
    pkgs.cups
    pkgs.dbus
    pkgs.expat
    pkgs.pango
    pkgs.cairo
    pkgs.gdk-pixbuf
    pkgs.mesa
    pkgs.alsa-lib

    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.xorg.libxcb
  ];
}
