import 'package:flutter/material.dart';
import '../config/theme.dart';

class MoviCashBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const MoviCashBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      selectedItemColor: MoviCashColors.lilaInnovacion,
      unselectedItemColor: MoviCashColors.textoGris,
      type: BottomNavigationBarType.fixed,
      showUnselectedLabels: true,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Inicio'),
        BottomNavigationBarItem(icon: Icon(Icons.swap_vert), label: 'Movimientos'),
        BottomNavigationBarItem(icon: Icon(Icons.people_outline), label: 'Comunidad'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Perfil'),
      ],
    );
  }
}
